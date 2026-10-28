using TCT.LMS.Application.Interfaces.Repositories;

namespace TCT.LMS.Application.Interfaces.Services;

public sealed record AccountsReportQuery(
    DateTime? FromDate, DateTime? ToDate, string? Search, Guid? StudentId, Guid? TutorId, Guid? SubjectId,
    Guid? BankId, Guid? BoardId, Guid? GradeId, string? Country, string? PaymentMode,
    string? Status, string? GroupBy, string? SortBy, string? SortDirection, int? Page, int? PageSize);

public interface IAccountsReportsService
{
    Task<AccountsReportPage> GetPageAsync(string report, string view, AccountsReportQuery query, CancellationToken token);

    Task<IReadOnlyDictionary<string, object?>?> GetSummaryAsync(string report, AccountsReportQuery query, CancellationToken token);

    Task<IReadOnlyDictionary<string, IReadOnlyList<IReadOnlyDictionary<string, object?>>>> GetFilterOptionsAsync(
        CancellationToken token);

    /// <summary>Role Permission check for one Accounts report (report = null: any Accounts report).</summary>
    Task<bool> HasReportPermissionAsync(string roleName, string? report, CancellationToken token);
}
