using TCT.LMS.Application.Interfaces.Repositories;

namespace TCT.LMS.Application.Interfaces.Services;

public interface ICoordinatorDashboardService
{
    Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> QueryAsync(
        CoordinatorDashboardQuery query, Guid coordinatorId, DateTime? fromDate,
        DateTime? toDate, int? take, CancellationToken token);
}
