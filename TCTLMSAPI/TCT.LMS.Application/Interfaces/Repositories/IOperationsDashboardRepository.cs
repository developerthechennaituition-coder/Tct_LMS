namespace TCT.LMS.Application.Interfaces.Repositories;

public enum OperationsDashboardQuery
{
    Summary,
    PlannedClasses,
    RescheduledClasses,
    ActiveStudents,
    ActiveTutors,
    LowEngagementTutors,
    CancelledClasses,
    MissedAttendance,
    DailyClassSummary,
    TimeWiseClasses,
    EnrollmentByCourse,
    EnrollmentTrend,
    DailyCompletion,
    StudentMismatch,
    OperationMismatch,
    TutorMismatch,
    ExtraClasses
}

public interface IOperationsDashboardRepository
{
    Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> QueryAsync(
        OperationsDashboardQuery query,
        DateTime reportDate,
        DateTime fromDate,
        DateTime toDate,
        int take,
        CancellationToken token);
}
