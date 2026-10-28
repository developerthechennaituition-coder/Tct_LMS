namespace TCT.LMS.Application.Interfaces.Repositories;

/// <summary>Filters, sorting and paging for one Operations report view (read-only).</summary>
public sealed record OperationsReportRequest(
    string Report,
    string View,
    DateTime FromDate,
    DateTime ToDate,
    string? Search,
    Guid? TutorId,
    Guid? StudentId,
    Guid? SubjectId,
    string? Status,
    string GroupBy,
    string? SortBy,
    bool SortDescending,
    int Page,
    int PageSize);

public sealed record OperationsReportPage(
    IReadOnlyList<IReadOnlyDictionary<string, object?>> Rows,
    long TotalRows,
    int Page,
    int PageSize);

public interface IOperationsReportsRepository
{
    bool IsKnownView(string report, string view);
    bool IsKnownReport(string report);

    /// <summary>
    /// True when the role has a saved Role Permission (View/Add/Edit/Delete) on the report's menu entry
    /// (Menu.Link = /lms/operation/reports/{report}); with report = null, on any report entry.
    /// </summary>
    Task<bool> HasReportPermissionAsync(string roleName, string? report, CancellationToken token);

    Task<OperationsReportPage> GetPageAsync(OperationsReportRequest request, CancellationToken token);

    Task<IReadOnlyDictionary<string, object?>?> GetSummaryAsync(OperationsReportRequest request, CancellationToken token);

    Task<IReadOnlyDictionary<string, IReadOnlyList<IReadOnlyDictionary<string, object?>>>> GetFilterOptionsAsync(
        CancellationToken token);
}
