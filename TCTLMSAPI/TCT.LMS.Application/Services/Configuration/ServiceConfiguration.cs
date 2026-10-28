using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Domain.Entities;

namespace TCT.LMS.Application.Services.Configuration;

public static class ServiceConfiguration
{
    public static IServiceCollection AddServices(this IServiceCollection service, ConfigurationManager configuration)
    {
        service.AddTransient(typeof(IGenericService<>), typeof(GenericService<>));
        service.AddTransient(typeof(IMasterDetailService), typeof(MasterDetailService));
        service.AddTransient(typeof(ISalesService), typeof(SalesService));
        service.AddTransient(typeof(IUserService), typeof(UserService));
        service.AddTransient(typeof(IStudentService), typeof(StudentService));
        service.AddTransient(typeof(IAddressService), typeof(AddressService));
        service.AddTransient<TokenService>();
        service.AddScoped<EmailServiceStrategy>();
        service.AddScoped<SmsServiceStrategy>();
        service.AddScoped<ICommunicationFactory, CommunicationFactory>();
        service.AddScoped<INotificationService,NotificationService>();
        service.AddScoped<IPasswordHasher<User>, CustomPasswordHasher>();
        service.AddScoped(typeof(IAuthService), typeof(AuthService));
        service.AddScoped(typeof(IMenuService), typeof(MenuService));
        service.AddScoped(typeof(IDocumentService), typeof(DocumentService));
        service.AddTransient(typeof(ITutorService), typeof(TutorService));
        service.AddTransient(typeof(IScheduleService), typeof(ScheduleService));
        service.AddTransient(typeof(IUserRatingService), typeof(UserRatingService));
        service.AddTransient(typeof(IAdminDashboardService), typeof(AdminDashboardService));
        service.AddTransient(typeof(ITutorStudentAllocationService), typeof(TutorStudentAllocationService));
        service.AddTransient(typeof(IDashboardService), typeof(DashboardService));
        service.AddTransient<IStudentDashboardService, StudentDashboardService>();
        service.AddTransient<ITutorDashboardService, TutorDashboardService>();
        service.AddTransient<IOperationsDashboardService, OperationsDashboardService>();
        service.AddTransient<IOperationsReportsService, OperationsReportsService>();
        service.AddTransient<IMyCalendarService, MyCalendarService>();
        service.AddTransient<IAssignmentChangeRequestService>(provider => new AssignmentChangeRequestService(
            provider.GetRequiredService<IAssignmentChangeRequestRepository>(),
            provider.GetRequiredService<IScheduleRepository>()));
        service.AddTransient<IAccountsReportsService, AccountsReportsService>();
        service.AddTransient<ICoordinatorDashboardService, CoordinatorDashboardService>();
        service.AddTransient<ISuperAdminDashboardService, SuperAdminDashboardService>();
        service.AddTransient<ICoordinatorAdminDashboardService, CoordinatorAdminDashboardService>();
        service.AddTransient<IRemainingDashboardService, RemainingDashboardService>();
        service.AddScoped<IChatService, ChatService>();
        service.AddTransient(typeof(IPaymentPercentageService), typeof(PaymentPercentageService));
        service.AddTransient(typeof(ICancellationPolicyService), typeof(CancellationPolicyService));
        service.AddTransient(typeof(ICurrentUserService), typeof(CurrentUserService));
        service.AddTransient(typeof(IClassOperationsService), typeof(ClassOperationsService));
        service.AddTransient(typeof(IMessageStatusService), typeof(MessageStatusService));
        service.AddScoped(typeof(IAssessmentService), typeof(AssessmentService));
        service.AddSingleton(TimeProvider.System);
        return service;
    }
}




