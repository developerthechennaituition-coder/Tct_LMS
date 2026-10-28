using TCT.LMS.Application.Interfaces.Repositories;

namespace TCT.LMS.Application.Interfaces.Services;

public interface IStudentDashboardService
{
    Task<Guid> GetStudentIdAsync(Guid userId, CancellationToken token);

    Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> QueryAsync(
        StudentDashboardQuery query,
        Guid studentId,
        Guid authenticatedUserId,
        DateTime? fromDate,
        DateTime? toDate,
        int? take,
        CancellationToken token);
}
