using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;

namespace TCT.LMS.Application.Services;

public sealed class AccountsReportsService : IAccountsReportsService
{
    private static readonly string[] GroupByValues = { "day", "month", "quarter", "year" };
    private readonly IAccountsReportsRepository _repository;

    public AccountsReportsService(IAccountsReportsRepository repository) => _repository = repository;

    public Task<AccountsReportPage> GetPageAsync(string report, string view, AccountsReportQuery query, CancellationToken token)
    {
        var key = (report ?? "").Trim().ToLowerInvariant();
        var viewKey = (view ?? "").Trim().ToLowerInvariant();
        if (!_repository.IsKnownView(key, viewKey))
            throw new ArgumentException($"Unknown report view '{report}/{view}'.");
        return _repository.GetPageAsync(BuildRequest(key, viewKey, query), token);
    }

    public Task<IReadOnlyDictionary<string, object?>?> GetSummaryAsync(string report, AccountsReportQuery query, CancellationToken token)
    {
        var key = (report ?? "").Trim().ToLowerInvariant();
        if (!_repository.IsKnownReport(key))
            throw new ArgumentException($"Unknown report '{report}'.");
        return _repository.GetSummaryAsync(BuildRequest(key, "summary", query with { Status = null }), token);
    }

    public Task<IReadOnlyDictionary<string, IReadOnlyList<IReadOnlyDictionary<string, object?>>>> GetFilterOptionsAsync(
        CancellationToken token) => _repository.GetFilterOptionsAsync(token);

    public Task<bool> HasReportPermissionAsync(string roleName, string? report, CancellationToken token)
        => _repository.HasReportPermissionAsync(roleName, report?.Trim().ToLowerInvariant(), token);

    // Default range: the current month (1st to today), matching the Accounts dashboard's monthly view.
    private static AccountsReportRequest BuildRequest(string report, string view, AccountsReportQuery q)
    {
        var to = (q.ToDate ?? DateTime.Today).Date;
        var from = (q.FromDate ?? new DateTime(to.Year, to.Month, 1)).Date;
        if (from > to) throw new ArgumentException("fromDate must be on or before toDate.");
        if ((to - from).TotalDays > 3700) throw new ArgumentException("The date range cannot exceed 10 years.");

        var group = (q.GroupBy ?? "month").Trim().ToLowerInvariant();
        if (Array.IndexOf(GroupByValues, group) < 0) group = "month";

        static string? Clean(string? value, int max) =>
            string.IsNullOrWhiteSpace(value) ? null : value.Trim().Length > max ? value.Trim()[..max] : value.Trim();
        static Guid? Id(Guid? value) => value == Guid.Empty ? null : value;

        return new AccountsReportRequest(
            report, view, from, to,
            Clean(q.Search, 100), Id(q.StudentId), Id(q.TutorId), Id(q.SubjectId), Id(q.BankId), Id(q.BoardId), Id(q.GradeId),
            Clean(q.Country, 20), Clean(q.PaymentMode, 50), Clean(q.Status, 50),
            group,
            Clean(q.SortBy, 64),
            string.Equals(q.SortDirection, "desc", StringComparison.OrdinalIgnoreCase),
            Math.Max(1, q.Page ?? 1),
            Math.Clamp(q.PageSize ?? 10, 1, 100));
    }
}
