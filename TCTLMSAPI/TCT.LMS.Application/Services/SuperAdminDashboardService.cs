using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;

namespace TCT.LMS.Application.Services;

public sealed class SuperAdminDashboardService : ISuperAdminDashboardService
{
    private readonly ISuperAdminDashboardRepository _repository;

    public SuperAdminDashboardService(ISuperAdminDashboardRepository repository)
        => _repository = repository;

    public Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> QueryAsync(
        SuperAdminDashboardQuery query,
        DateTime? fromDate,
        DateTime? toDate,
        int? take,
        CancellationToken token)
    {
        var effectiveToDate = (toDate ?? DateTime.Today).Date;
        var effectiveFromDate = (fromDate ?? effectiveToDate.AddMonths(-1)).Date;
        if (effectiveFromDate > effectiveToDate)
            throw new ArgumentException("fromDate must be on or before toDate.");

        return _repository.QueryAsync(
            query,
            effectiveFromDate,
            effectiveToDate,
            Math.Clamp(take ?? 100, 1, 500),
            token);
    }
}
