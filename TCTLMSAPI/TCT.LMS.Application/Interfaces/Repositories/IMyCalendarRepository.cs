namespace TCT.LMS.Application.Interfaces.Repositories;

/// <summary>A demo class shown on My Calendar (same field names the shared calendar component reads).</summary>
public sealed class MyCalendarDemoDto
{
    public Guid ScheduleDetailsId { get; set; }
    public Guid ScheduleId { get; set; }
    public Guid SalesDetailsId { get; set; }
    /// <summary>Sale of the enrolment; the shared calendar's demo popup needs it (GET /Sales/salesDetails).</summary>
    public Guid SalesId { get; set; }
    public Guid StudentId { get; set; }
    public Guid? StudentUserId { get; set; }
    public string? StudentName { get; set; }
    public Guid? TutorUserId { get; set; }
    public string? TutorName { get; set; }
    public Guid SubjectId { get; set; }
    public string? SubjectName { get; set; }
    public string? Title { get; set; }
    public DateTime Date { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public string ScheduleType { get; set; } = "Demo";
    public string? MeetingLink { get; set; }
    public Guid? TutorScheduleStatus { get; set; }
    public Guid? StudentScheduleStatus { get; set; }
    public Guid? OperationScheduleStatus { get; set; }
    /// <summary>Existing demo status name (Operations, Tutor or Student status, whichever is set), else "Scheduled".</summary>
    public string StatusName { get; set; } = "Scheduled";

    // Enrolment (course) follow-up status — SalesDetails.Status, the status the demo workflow updates.
    public Guid? EnrollmentStatusId { get; set; }
    public int? EnrollmentStatusCode { get; set; }
    public string? EnrollmentStatusName { get; set; }
    public Guid CoordinatorUserId { get; set; }
    /// <summary>True when the signed-in user may change this demo's status (set by the service).</summary>
    public bool CanUpdateStatus { get; set; }
}

/// <summary>A follow-up reminder from My Calendar's status workflow, shown on its single reminder date.</summary>
public sealed class MyCalendarFollowUpDto
{
    public Guid HistoryId { get; set; }
    public Guid SalesDetailsId { get; set; }
    public Guid SalesId { get; set; }
    public Guid CoordinatorUserId { get; set; }
    public string? StudentName { get; set; }
    public string? TutorName { get; set; }
    public string? SubjectName { get; set; }
    public Guid StatusId { get; set; }
    public int StatusCode { get; set; }
    public string? StatusName { get; set; }
    /// <summary>The "Remind Me" date (older date-range rows: their start date).</summary>
    public DateTime ReminderDate { get; set; }
    public bool CanUpdateStatus { get; set; }
}

/// <summary>A lookup value (Type_Code).</summary>
public sealed record TypeCodeOption(Guid Id, int Value, string Name);

/// <summary>An enrolment's current status and its latest My Calendar status change (if any).</summary>
public sealed class EnrollmentStatusState
{
    public Guid SalesDetailsId { get; set; }
    public Guid CoordinatorUserId { get; set; }
    public Guid? StatusId { get; set; }
    public int? StatusCode { get; set; }
    public string? StatusName { get; set; }
    public Guid? LastHistoryStatusId { get; set; }
    public DateTime? FollowUpStartDate { get; set; }
    public DateTime? FollowUpEndDate { get; set; }
    /// <summary>The saved "Remind Me" date (older date-range rows: their start date).</summary>
    public DateTime? ReminderDate { get; set; }
    public Guid? DropoutReasonId { get; set; }
    public string? DropoutReasonName { get; set; }
    public string? ChangedByName { get; set; }
    public DateTime? ChangedDate { get; set; }
}

public enum DemoStatusUpdateOutcome
{
    Updated,
    NoChange,
    NotFound,
    NotOwner,
}

/// <summary>An eligible task recipient: an active user with at least one active non-Tutor/Student role.</summary>
public sealed record TaskAssigneeDto(Guid UserId, string Name, string? UserCode, string? Email, IReadOnlyList<string> Roles);

public sealed class UserTaskDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Guid AssignedToUserId { get; set; }
    public string? AssignedToName { get; set; }
    public Guid AssignedByUserId { get; set; }
    public string? AssignedByName { get; set; }
    public DateTime DueDate { get; set; }
    public string? Priority { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedDate { get; set; }
    public DateTime? CompletedDate { get; set; }
    public string? CompletedByName { get; set; }
}

public enum CompleteTaskOutcome
{
    Completed,
    NotFound,
    NotAssignee,
    AlreadyCompleted,
}

public interface IMyCalendarRepository
{
    /// <summary>Demo classes in the month the user may see (see the implementation for the per-role scope).</summary>
    Task<IReadOnlyList<MyCalendarDemoDto>> GetDemoSchedulesAsync(Guid userId, IReadOnlyCollection<string> roles, int month, int year, CancellationToken token);

    /// <summary>Regular classes in the month the user may see (Operations / Operations Admin: owned students; no other role).</summary>
    Task<IReadOnlyList<MyCalendarDemoDto>> GetClassSchedulesAsync(Guid userId, IReadOnlyCollection<string> roles, int month, int year, CancellationToken token);

    Task<IReadOnlyList<TaskAssigneeDto>> GetTaskAssigneesAsync(IReadOnlyCollection<string> excludedRoles, CancellationToken token);

    Task<bool> IsEligibleAssigneeAsync(Guid userId, IReadOnlyCollection<string> excludedRoles, CancellationToken token);

    /// <summary>Tasks assigned to the user and tasks the user assigned.</summary>
    Task<IReadOnlyList<UserTaskDto>> GetTasksForUserAsync(Guid userId, CancellationToken token);

    Task<UserTaskDto?> GetTaskAsync(Guid taskId, CancellationToken token);

    /// <summary>Saves the task and (unless self-assigned) the assignee's notification in one transaction.</summary>
    Task<Guid> CreateTaskAsync(Guid assignedByUserId, Guid assignedToUserId, string title, string description,
        DateTime dueDate, string? priority, CancellationToken token);

    /// <summary>
    /// Marks the task Completed only when <paramref name="callerUserId"/> is its assignee and it is still Pending
    /// (single conditional update, so repeated submissions cannot complete it twice), then notifies the assigner
    /// in the same transaction.
    /// </summary>
    Task<CompleteTaskOutcome> CompleteTaskAsync(Guid taskId, Guid callerUserId, CancellationToken token);

    // ─── Demo status workflow ───

    /// <summary>Active lookup values by TypeCodeValue (e.g. the 12 demo statuses), or of a whole lookup group.</summary>
    Task<IReadOnlyList<TypeCodeOption>> GetTypeCodesAsync(IReadOnlyCollection<int>? values, int? groupCode, CancellationToken token);

    /// <summary>Current follow-up reminders dated in the month, in the same per-role scope as the demos.</summary>
    Task<IReadOnlyList<MyCalendarFollowUpDto>> GetFollowUpsAsync(Guid userId, IReadOnlyCollection<string> roles, int month, int year, CancellationToken token);

    Task<EnrollmentStatusState?> GetEnrollmentStatusAsync(Guid salesDetailsId, CancellationToken token);

    /// <summary>
    /// In one transaction: re-checks that <paramref name="callerUserId"/> is the enrolment's Coordinator, records a
    /// DemoStatusHistory row and sets SalesDetails.Status (and FollowUpDate = reminder date when one is given).
    /// Returns NoChange (no new row) when the status, reminder date and reason are identical to the current ones.
    /// </summary>
    Task<DemoStatusUpdateOutcome> UpdateDemoStatusAsync(Guid salesDetailsId, Guid callerUserId, Guid statusId,
        DateTime? reminderDate, Guid? dropoutReasonId, CancellationToken token);
}
