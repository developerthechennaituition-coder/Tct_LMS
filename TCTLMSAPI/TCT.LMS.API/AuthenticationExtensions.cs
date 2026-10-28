using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;
using System.Text;
using TCT.LMS.Domain.Base;

namespace TCT.LMS.API;

public static class AuthenticationExtensions
{
    public static IServiceCollection AddAuthenticationOptions(this IServiceCollection service, ConfigurationManager configuration)
    {
        var applicationSettings = configuration.GetSection(nameof(ApplicationSettings)).Get<ApplicationSettings>();
        var jwtSettings = applicationSettings?.JwtSettings;
        var tokenValidationParams = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(jwtSettings.SecretKey)),
            ValidIssuer = jwtSettings.Issuer,
            ValidateIssuer = true,
            ValidAudience = jwtSettings.Audience,
            ValidateAudience = true,
            RequireExpirationTime = true,
            ValidateLifetime = true
        };
        service.AddSingleton(tokenValidationParams);

        service.AddSwaggerGen(options =>
        {
            options.InferSecuritySchemes();
            options.AddSecurityRequirement(new OpenApiSecurityRequirement
                {
                    {
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
                        },
                        new string[] {}
                    }
                });
        });

        service.Configure<SwaggerGeneratorOptions>(options =>
        {
            options.InferSecuritySchemes = true;
        });

        service.AddAuthorization();
        service.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.SaveToken = true;
                options.RequireHttpsMetadata = true;
                options.TokenValidationParameters = tokenValidationParams;
            });

        return service;
    }
}
