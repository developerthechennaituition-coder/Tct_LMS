using TCT.LMS.Application.Interfaces.Repositories;

namespace TCT.LMS.Application.Interfaces.Services;

public interface ITutorDashboardService
{
    Task<Guid> GetTutorIdAsync(Guid userId, CancellationToken token);

    Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> QueryAsync(
        TutorDashboardQuery query,
        Guid tutorId,
        Guid authenticatedUserId,
        DateTime? fromDate,
        DateTime? toDate,
        int? take,
        CancellationToken token);
}
