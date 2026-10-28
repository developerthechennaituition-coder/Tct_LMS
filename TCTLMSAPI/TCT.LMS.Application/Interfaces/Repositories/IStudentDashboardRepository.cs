namespace TCT.LMS.Application.Interfaces.Repositories;

public enum StudentDashboardQuery
{
    Profile,
    Courses,
    UpcomingClasses,
    Attendance,
    MonthlyAttendance,
    Tutors,
    Ratings,
    Notifications,
    UnreadNotificationCount,
    MessageSummary,
    Conversations,
    Feedback,
    Summary
}

public interface IStudentDashboardRepository
{
    Task<Guid?> GetStudentIdByUserAsync(Guid userId, CancellationToken token);
    Task<bool> BelongsToUserAsync(Guid studentId, Guid userId, CancellationToken token);
    Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> QueryAsync(
        StudentDashboardQuery query,
        Guid studentId,
        DateTime? fromDate,
        DateTime? toDate,
        int? take,
        CancellationToken token);
}
