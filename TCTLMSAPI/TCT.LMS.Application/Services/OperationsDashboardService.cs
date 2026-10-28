using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;

namespace TCT.LMS.Application.Services;

public sealed class OperationsDashboardService : IOperationsDashboardService
{
    private readonly IOperationsDashboardRepository _repository;

    public OperationsDashboardService(IOperationsDashboardRepository repository)
        => _repository = repository;

    public Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> QueryAsync(
        OperationsDashboardQuery query,
        DateTime? reportDate,
        DateTime? fromDate,
        DateTime? toDate,
        int? take,
        CancellationToken token)
    {
        var effectiveReportDate = (reportDate ?? DateTime.Today).Date;
        var effectiveFromDate = (fromDate ?? effectiveReportDate.AddMonths(-12)).Date;
        var effectiveToDate = (toDate ?? effectiveReportDate).Date;

        if (effectiveFromDate > effectiveToDate)
            throw new ArgumentException("fromDate must be on or before toDate.");

        return _repository.QueryAsync(
            query,
            effectiveReportDate,
            effectiveFromDate,
            effectiveToDate,
            Math.Clamp(take ?? 100, 1, 500),
            token);
    }
}
