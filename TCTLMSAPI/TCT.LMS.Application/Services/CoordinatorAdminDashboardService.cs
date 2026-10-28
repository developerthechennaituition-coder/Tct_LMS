using TCT.LMS.Application.Interfaces.Repositories; using TCT.LMS.Application.Interfaces.Services;
namespace TCT.LMS.Application.Services;
public sealed class CoordinatorAdminDashboardService : ICoordinatorAdminDashboardService
{
    private readonly ICoordinatorAdminDashboardRepository _repository; public CoordinatorAdminDashboardService(ICoordinatorAdminDashboardRepository repository)=>_repository=repository;
    public Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> QueryAsync(CoordinatorAdminDashboardQuery query,DateTime? fromDate,DateTime? toDate,int? take,CancellationToken token){var to=(toDate??DateTime.Today).Date;var from=(fromDate??to.AddMonths(-1)).Date;if(from>to)throw new ArgumentException("fromDate must be on or before toDate.");return _repository.QueryAsync(query,from,to,Math.Clamp(take??100,1,500),token);}
}
