using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;

namespace TCT.LMS.Application.Services;

public sealed class CoordinatorDashboardService : ICoordinatorDashboardService
{
    private readonly ICoordinatorDashboardRepository _repository;
    public CoordinatorDashboardService(ICoordinatorDashboardRepository repository) => _repository = repository;

    public Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> QueryAsync(
        CoordinatorDashboardQuery query, Guid coordinatorId, DateTime? fromDate,
        DateTime? toDate, int? take, CancellationToken token)
    {
        if (coordinatorId == Guid.Empty) throw new ArgumentException("A coordinator ID is required.");
        var end = (toDate ?? DateTime.Today).Date;
        var start = (fromDate ?? end.AddMonths(-1)).Date;
        if (start > end) throw new ArgumentException("fromDate must be on or before toDate.");
        return _repository.QueryAsync(query, coordinatorId, start, end, Math.Clamp(take ?? 100, 1, 500), token);
    }
}
