using TCT.LMS.Application.Interfaces.Repositories;
namespace TCT.LMS.Application.Interfaces.Services;
public interface ICoordinatorAdminDashboardService
{
    Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> QueryAsync(CoordinatorAdminDashboardQuery query, DateTime? fromDate, DateTime? toDate, int? take, CancellationToken token);
}
