namespace TCT.LMS.Application.Interfaces.Repositories;

public enum TutorDashboardQuery
{
    Profile,
    DemoVideos,
    Subjects,
    Schedule,
    DemoHistory,
    AllocationHistory,
    CurrentStudents,
    Availability,
    Ratings,
    MonthlyHours,
    CancellationHistory,
    Homework,
    Summary
}

public interface ITutorDashboardRepository
{
    Task<Guid?> GetTutorIdByUserAsync(Guid userId, CancellationToken token);
    Task<bool> BelongsToUserAsync(Guid tutorId, Guid userId, CancellationToken token);

    Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> QueryAsync(
        TutorDashboardQuery query,
        Guid tutorId,
        DateTime? fromDate,
        DateTime? toDate,
        int? take,
        CancellationToken token);
}
