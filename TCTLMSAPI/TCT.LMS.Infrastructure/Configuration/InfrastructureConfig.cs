using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using TCT.LMS.Application;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Application.Services;
using TCT.LMS.Data.Common;
using TCT.LMS.Infrastructure.Repositories;

namespace TCT.LMS.Infrastructure.Configuration;

public static class InfrastructureConfig
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection service, ConfigurationManager configuration)
    {
        var isDevelopment = configuration["ASPNETCORE_ENVIRONMENT"] == "Development";

        service.AddDbContext<ApplicationDbContext>(options =>
        {
            options.UseSqlServer(configuration.GetConnectionString("TCTDb"));
            if (isDevelopment)
                options.EnableSensitiveDataLogging();
            options.UseLoggerFactory(LoggerFactory.Create(builder => builder.AddDebug()));
        });

        service.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
        service.AddScoped(typeof(IMasterDetailRepository), typeof(MasterDetailRepository));
        service.AddScoped(typeof(ISalesRepository), typeof(SalesRepository));
        service.AddScoped(typeof(IStudentRepository), typeof(StudentRepository));
        service.AddScoped(typeof(IUserRepository), typeof(UserRepository));
        service.AddScoped(typeof(IRoleRepository), typeof(RoleRepository));
        service.AddScoped(typeof(IUserRoleRepository), typeof(UserRoleRepository));
        service.AddScoped(typeof(IRolePermissionRepository), typeof(RolePermissionRepository));
        service.AddScoped(typeof(IPermissionRepository), typeof(PermissionRepository));
        service.AddScoped(typeof(IAddressRepository), typeof(AddressRepository));
        service.AddScoped(typeof(IAuthRepository), typeof(AuthRepository));
        service.AddScoped(typeof(IMenuRepository), typeof(MenuRepository));
        service.AddScoped(typeof(IDocumentRepository), typeof(DocumentRepository));
        service.AddScoped(typeof(IDocumentStorageRepository), typeof(DocumentStorageRepository));
        service.AddScoped(typeof(ITutorRepository), typeof(TutorRepository));
        service.AddScoped(typeof(INotificationRepository), typeof(NotificationRepository));
        service.AddScoped(typeof(IScheduleRepository), typeof(ScheduleRepository));
        service.AddScoped(typeof(IThresholdRepository), typeof(ThresholdRepository));
        service.AddScoped(typeof(INotesRepository), typeof(NotesRepository));
        service.AddScoped(typeof(IScheduleDetailsRepository), typeof(ScheduleDetailsRepository));
        service.AddScoped(typeof(IAdminDashboardRepository), typeof(AdminDashboardRepository));
        service.AddScoped(typeof(INotificationDetailsRepository), typeof(NotificationDetailsRepository));
        service.AddScoped(typeof(ISalesDetailsRepository), typeof(SalesDetailsRepository));
        service.AddScoped(typeof(IUserRatingRepository), typeof(UserRatingRepository));
        service.AddScoped(typeof(ITutorStudentAllocationRepository), typeof(TutorStudentAllocationRepository));
        service.AddScoped(typeof(IPaymentPercentageRepository), typeof(PaymentPercentageRepository));
        service.AddScoped(typeof(IDashboardRepository), typeof(DashboardRepository));
        service.AddScoped<IStudentDashboardRepository, StudentDashboardRepository>();
        service.AddScoped<ITutorDashboardRepository, TutorDashboardRepository>();
        service.AddScoped<IOperationsDashboardRepository, OperationsDashboardRepository>();
        service.AddScoped<IOperationsReportsRepository, OperationsReportsRepository>();
        service.AddScoped<IMyCalendarRepository, MyCalendarRepository>();
        service.AddScoped<IAssignmentChangeRequestRepository, AssignmentChangeRequestRepository>();
        service.AddScoped<IAccountsReportsRepository, AccountsReportsRepository>();
        service.AddScoped<ICoordinatorDashboardRepository, CoordinatorDashboardRepository>();
        service.AddScoped<ISuperAdminDashboardRepository, SuperAdminDashboardRepository>();
        service.AddScoped<ICoordinatorAdminDashboardRepository, CoordinatorAdminDashboardRepository>();
        service.AddScoped<IRemainingDashboardRepository, RemainingDashboardRepository>();
        service.AddScoped(typeof(ITutorPaymentApprovalRepository), typeof(TutorPaymentApprovalRepository));
        service.AddScoped(typeof(IChatGroupRepository), typeof(ChatGroupRepository));
        service.AddScoped(typeof(IGroupMemberRepository), typeof(GroupMemberRepository));
        service.AddScoped<IChatRepository, ChatRepository>();
        service.AddScoped<IChatLabelRepository, ChatLabelRepository>();
        service.AddScoped(typeof(IMessageStatusRepository), typeof(MessageStatusRepository));
        service.AddScoped(typeof(IAssessmentRepository), typeof(AssessmentRepository));
        return service;
    }
}




