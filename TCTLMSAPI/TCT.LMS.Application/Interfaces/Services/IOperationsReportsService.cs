using TCT.LMS.Application.Interfaces.Repositories;

namespace TCT.LMS.Application.Interfaces.Services;

public interface IOperationsReportsService
{
    Task<OperationsReportPage> GetPageAsync(
        string report, string view, DateTime? fromDate, DateTime? toDate, string? search,
        Guid? tutorId, Guid? studentId, Guid? subjectId, string? status, string? groupBy,
        string? sortBy, string? sortDirection, int? page, int? pageSize, CancellationToken token);

    Task<IReadOnlyDictionary<string, object?>?> GetSummaryAsync(
        string report, DateTime? fromDate, DateTime? toDate, string? search,
        Guid? tutorId, Guid? studentId, Guid? subjectId, CancellationToken token);

    Task<IReadOnlyDictionary<string, IReadOnlyList<IReadOnlyDictionary<string, object?>>>> GetFilterOptionsAsync(
        CancellationToken token);

    /// <summary>Role Permission check for one report (report = null: any report).</summary>
    Task<bool> HasReportPermissionAsync(string roleName, string? report, CancellationToken token);
}
