using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TCT.LMS.Application.Services.Configuration;
using TCT.LMS.Data.Common;
using TCT.LMS.Domain.Base;
using TCT.LMS.Infrastructure.Configuration;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.OpenApi.Models;
using Microsoft.AspNetCore.Authorization;
using TCT.LMS.Infrastructure.Middlewares;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Application.Services;
using TCT.LMS.API.Authentication;
using TCT.LMS.API.AutoMapperProfile;
using TCT.LMS.API.NotificationHub;
using TCT.LMS.API;
using TCT.LMS.Infrastructure.Common;

var builder = WebApplication.CreateBuilder(args);
var applicationSettings = builder.Configuration.GetSection(nameof(ApplicationSettings)).Get<ApplicationSettings>();
builder.Services.Configure<ApplicationSettings>(options => builder.Configuration.GetSection(nameof(ApplicationSettings)).Bind(options));
builder.Services.AddSingleton<ApplicationSettings>(x => x.GetRequiredService<IOptions<ApplicationSettings>>().Value);

builder.Services.Configure<AuditOptions>(options =>
{
    options.IncludedTables = new HashSet<string> { "SalesDetails" };
    options.IncludedColumnsPerTable = new Dictionary<string, HashSet<string>>
    {
        { "SalesDetails", new HashSet<string> { "Status", "FollowUpDate" } }
    };
});

var connectionString = builder.Configuration.GetConnectionString("TCTDb");
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<AuditSaveChangesInterceptor>();
builder.Services.AddDbContext<ApplicationDbContext>((provider, options) =>
{
    var interceptor = provider.GetRequiredService<AuditSaveChangesInterceptor>();
    options.UseSqlServer(connectionString)
           .AddInterceptors(interceptor);
}, ServiceLifetime.Transient);

builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("JwtSettings"));

builder.Services
.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,

        ValidIssuer = builder.Configuration["JwtSettings:Issuer"],
        ValidAudience = builder.Configuration["JwtSettings:Audience"],

        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["JwtSettings:Key"]))
    };

    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];

            var path = context.HttpContext.Request.Path;

            if (!string.IsNullOrEmpty(accessToken) &&
                (path.StartsWithSegments("/pushNotificationHub") ||
                 path.StartsWithSegments("/api/pushNotificationHub")))
            {
                context.Token = accessToken;
            }

            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization(options =>
{
    foreach (var permission in PermissionClaims.GetAllPermissions())
    {
        options.AddPolicy(permission, policy =>
            policy.RequireClaim("Permission", permission));
    }
});

builder.Services.AddControllers();
builder.Services.AddAutoMapper(typeof(MappingProfile));
builder.Services.AddSignalR();
builder.Services.AddHostedService<ClassReminderService>();

var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter 'Bearer' [space] and then your valid token in the text input below.\r\n\r\nExample: \"Bearer 12345abcdef\"",
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});

builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddServices(builder.Configuration);

// Classroom API client — internal service-to-service, fire-and-forget room provisioning
builder.Services.AddHttpClient("ClassroomApi", client =>
{
    var baseUrl = builder.Configuration["ClassroomApi:BaseUrl"] ?? "http://localhost:5200";
    client.BaseAddress = new Uri(baseUrl);
    client.DefaultRequestHeaders.Add("Accept", "application/json");
});
builder.Services.AddScoped<TCT.LMS.Application.Services.IClassroomProvisioningService,
                           TCT.LMS.API.ClassroomProvisioningService>();

QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;
builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("EmailSettings"));
builder.Services.AddScoped<IInvoicePdfService, InvoicePdfService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<ITutorPaySlipPdfService, TutorPaySlipPdfService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseDeveloperExceptionPage();
}
else
{
    app.UseExceptionHandler(errorApp =>
    {
        errorApp.Run(async context =>
        {
            context.Response.StatusCode = 500;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new { succeeded = false, message = "An unexpected error occurred." });
        });
    });
}

//app.UseHttpsRedirection();
app.UseRouting();
app.Use(async (context, next) =>
{
    Console.WriteLine(
        $"REQUEST: {context.Request.Method} {context.Request.Path} | Origin: {context.Request.Headers["Origin"]}"
    );

    await next();

    Console.WriteLine(
        $"RESPONSE: {context.Response.StatusCode}"
    );
});
app.UseCors("AllowReactApp");
app.UseAuthentication();
app.UseAuthorization();

app.UseEndpoints(endpoints =>
{
    endpoints.MapHub<PushNotificationHub>("/api/pushNotificationHub");
    endpoints.MapHub<PushNotificationHub>("/pushNotificationHub");
    endpoints.MapControllers();
});

app.Run();
