namespace TCT.LMS.Application.Interfaces.Repositories;

/// <summary>Filters, sorting and paging for one Accounts report view (read-only).</summary>
public sealed record AccountsReportRequest(
    string Report,
    string View,
    DateTime FromDate,
    DateTime ToDate,
    string? Search,
    Guid? StudentId,
    Guid? TutorId,
    Guid? SubjectId,
    Guid? BankId,
    Guid? BoardId,
    Guid? GradeId,
    string? Country,
    string? PaymentMode,
    string? Status,
    string GroupBy,
    string? SortBy,
    bool SortDescending,
    int Page,
    int PageSize);

public sealed record AccountsReportPage(
    IReadOnlyList<IReadOnlyDictionary<string, object?>> Rows,
    long TotalRows,
    int Page,
    int PageSize);

public interface IAccountsReportsRepository
{
    bool IsKnownView(string report, string view);
    bool IsKnownReport(string report);

    Task<AccountsReportPage> GetPageAsync(AccountsReportRequest request, CancellationToken token);

    Task<IReadOnlyDictionary<string, object?>?> GetSummaryAsync(AccountsReportRequest request, CancellationToken token);

    Task<IReadOnlyDictionary<string, IReadOnlyList<IReadOnlyDictionary<string, object?>>>> GetFilterOptionsAsync(
        CancellationToken token);

    /// <summary>
    /// True when the role has a saved Role Permission (View/Add/Edit/Delete) on the report's menu entry
    /// (Menu.Link = /lms/accounts/reports/{report}); with report = null, on any Accounts report entry.
    /// </summary>
    Task<bool> HasReportPermissionAsync(string roleName, string? report, CancellationToken token);
}
