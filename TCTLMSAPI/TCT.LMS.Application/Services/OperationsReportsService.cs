using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;

namespace TCT.LMS.Application.Services;

public sealed class OperationsReportsService : IOperationsReportsService
{
    private static readonly string[] GroupByValues = { "day", "week", "month" };
    private readonly IOperationsReportsRepository _repository;

    public OperationsReportsService(IOperationsReportsRepository repository) => _repository = repository;

    public Task<OperationsReportPage> GetPageAsync(
        string report, string view, DateTime? fromDate, DateTime? toDate, string? search,
        Guid? tutorId, Guid? studentId, Guid? subjectId, string? status, string? groupBy,
        string? sortBy, string? sortDirection, int? page, int? pageSize, CancellationToken token)
    {
        var key = (report ?? "").Trim().ToLowerInvariant();
        var viewKey = (view ?? "").Trim().ToLowerInvariant();
        if (!_repository.IsKnownView(key, viewKey))
            throw new ArgumentException($"Unknown report view '{report}/{view}'.");

        return _repository.GetPageAsync(
            BuildRequest(key, viewKey, fromDate, toDate, search, tutorId, studentId, subjectId, status, groupBy,
                sortBy, sortDirection, page, pageSize),
            token);
    }

    public Task<IReadOnlyDictionary<string, object?>?> GetSummaryAsync(
        string report, DateTime? fromDate, DateTime? toDate, string? search,
        Guid? tutorId, Guid? studentId, Guid? subjectId, CancellationToken token)
    {
        var key = (report ?? "").Trim().ToLowerInvariant();
        if (!_repository.IsKnownReport(key))
            throw new ArgumentException($"Unknown report '{report}'.");

        return _repository.GetSummaryAsync(
            BuildRequest(key, "summary", fromDate, toDate, search, tutorId, studentId, subjectId, null, null,
                null, null, null, null),
            token);
    }

    public Task<IReadOnlyDictionary<string, IReadOnlyList<IReadOnlyDictionary<string, object?>>>> GetFilterOptionsAsync(
        CancellationToken token) => _repository.GetFilterOptionsAsync(token);

    public Task<bool> HasReportPermissionAsync(string roleName, string? report, CancellationToken token)
        => _repository.HasReportPermissionAsync(roleName, report?.Trim().ToLowerInvariant(), token);

    // Same defaults as the Operations dashboard: the last 12 months up to today.
    private static OperationsReportRequest BuildRequest(
        string report, string view, DateTime? fromDate, DateTime? toDate, string? search,
        Guid? tutorId, Guid? studentId, Guid? subjectId, string? status, string? groupBy,
        string? sortBy, string? sortDirection, int? page, int? pageSize)
    {
        var to = (toDate ?? DateTime.Today).Date;
        var from = (fromDate ?? to.AddMonths(-12)).Date;
        if (from > to) throw new ArgumentException("fromDate must be on or before toDate.");

        var group = (groupBy ?? "day").Trim().ToLowerInvariant();
        if (Array.IndexOf(GroupByValues, group) < 0) group = "day";

        return new OperationsReportRequest(
            report, view, from, to,
            string.IsNullOrWhiteSpace(search) ? null : search.Trim(),
            tutorId == Guid.Empty ? null : tutorId,
            studentId == Guid.Empty ? null : studentId,
            subjectId == Guid.Empty ? null : subjectId,
            string.IsNullOrWhiteSpace(status) ? null : status.Trim(),
            group,
            string.IsNullOrWhiteSpace(sortBy) ? null : sortBy.Trim(),
            string.Equals(sortDirection, "desc", StringComparison.OrdinalIgnoreCase),
            Math.Max(1, page ?? 1),
            Math.Clamp(pageSize ?? 10, 1, 100));
    }
}
