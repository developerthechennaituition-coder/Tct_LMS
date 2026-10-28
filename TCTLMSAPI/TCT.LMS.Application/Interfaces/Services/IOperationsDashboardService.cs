using TCT.LMS.Application.Interfaces.Repositories;

namespace TCT.LMS.Application.Interfaces.Services;

public interface IOperationsDashboardService
{
    Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> QueryAsync(
        OperationsDashboardQuery query,
        DateTime? reportDate,
        DateTime? fromDate,
        DateTime? toDate,
        int? take,
        CancellationToken token);
}
