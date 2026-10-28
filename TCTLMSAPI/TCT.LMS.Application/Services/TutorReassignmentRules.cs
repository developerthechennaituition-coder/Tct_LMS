using TCT.LMS.Domain.Entities;

namespace TCT.LMS.Application.Services;

/// <summary>
/// Payroll-safety rules of the Tutor Change / Student Change approval: which class sessions move to the
/// replacement tutor, and which rate pays each schedule. The approval preview and the reassignment both
/// use <see cref="IsMovable"/>, so the classes checked for clashes are exactly the classes that move.
/// </summary>
public static class TutorReassignmentRules
{
    // Tutor / Student status written when a session is created; it is not an attendance mark.
    // Class Scheduled (20004) and Demo Scheduled (20019).
    public static readonly int[] PlaceholderStatusCodes = { 20004, 20019 };

    // A session moves only if it starts after the approval time, carries no attendance or Operations
    // marking, and is on no pay slip. Everything else stays with the original tutor, so a class that
    // was marked, approved or paid can never be paid again to the replacement tutor.
    public static bool IsMovable(ScheduleDetails session, DateTime after,
        IReadOnlySet<Guid> placeholderStatusIds, IReadOnlySet<Guid> invoicedSessionIds) =>
        session.StartTime > after
        && string.IsNullOrWhiteSpace(session.Status)
        && session.OperationScheduleStatus == null
        && IsUnmarked(session.TutorScheduleStatus, placeholderStatusIds)
        && IsUnmarked(session.StudentScheduleStatus, placeholderStatusIds)
        && session.TutorStartTime == null && session.TutorEndTime == null
        && session.StudentStartTime == null && session.StudentEndTime == null
        && session.OperationStartTime == null && session.OperationEndTime == null
        && session.IsTutorPresent == null && session.IsStudentPresent == null
        && !invoicedSessionIds.Contains(session.ScheduleDetailsId);

    // The older coordinator Assign / Change Tutor step changes the course tutor but does not move class
    // schedules, so it is refused while the course still has class sessions with another tutor that would
    // move under IsMovable; the Operations Tutor Change request moves them and their pay rates safely.
    public const string OlderTutorChangeBlockedMessage =
        "This course already has upcoming classes with its current tutor that have not been held. " +
        "Changing the tutor here would not move those classes. Please use a Tutor Change request " +
        "(raised by the student and approved by Operations), which moves the upcoming classes to the new tutor.";

    public static bool HasUnheldSessions(IEnumerable<ScheduleDetails> sessions, DateTime after,
        IReadOnlySet<Guid> placeholderStatusIds, IReadOnlySet<Guid> invoicedSessionIds) =>
        sessions.Any(session => IsMovable(session, after, placeholderStatusIds, invoicedSessionIds));

    private static bool IsUnmarked(Guid? status, IReadOnlySet<Guid> placeholderStatusIds) =>
        status == null || placeholderStatusIds.Contains(status.Value);

    // Rate that pays a schedule's classes: its stored rate, or the course rate when none is stored
    // (every schedule created outside this workflow), which is the calculation used before.
    public static decimal PayRate(decimal? scheduleRate, decimal courseRate) => scheduleRate ?? courseRate;

    // Rates on a split: the original schedule keeps the rate it was being paid at (its stored rate, else the
    // course rate before the change); the replacement schedule takes the replacement tutor's configured rate.
    public static (decimal Original, decimal Replacement) SplitRates(decimal? originalScheduleRate,
        decimal courseRateBeforeChange, decimal replacementRate) =>
        (PayRate(originalScheduleRate, courseRateBeforeChange), replacementRate);
}
