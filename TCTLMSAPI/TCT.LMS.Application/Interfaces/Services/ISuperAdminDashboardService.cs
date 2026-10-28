using TCT.LMS.Application.Interfaces.Repositories;

namespace TCT.LMS.Application.Interfaces.Services;

public interface ISuperAdminDashboardService
{
    Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> QueryAsync(
        SuperAdminDashboardQuery query,
        DateTime? fromDate,
        DateTime? toDate,
        int? take,
        CancellationToken token);
}
