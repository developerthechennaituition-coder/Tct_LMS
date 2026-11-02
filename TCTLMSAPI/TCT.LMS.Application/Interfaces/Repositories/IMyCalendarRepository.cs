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

    // ─── Deadline time and verification workflow (all optional for older tasks) ───
    /// <summary>Time of day of the deadline, same clock as <see cref="DueDate"/>; null = date-only.</summary>
    public TimeSpan? DueTime { get; set; }
    /// <summary>
    /// Effective workflow status: Assigned / InProgress / Completed / PendingVerification / ChangesRequested / Verified
    /// (UserTaskWorkflowStatus), worked out from Status and the stored WorkflowStatus.
    /// </summary>
    public string VerificationStatus { get; set; } = string.Empty;
    /// <summary>Stored dbo.UserTask.WorkflowStatus (null for tasks that never entered the workflow).</summary>
    public string? WorkflowStatus { get; set; }
    /// <summary>True when the signed-in user is the assignee and may submit / resubmit it (set by the service).</summary>
    public bool CanSubmitForVerification { get; set; }
    /// <summary>True when the signed-in user may verify it or request changes (set by the service).</summary>
    public bool CanVerify { get; set; }
    public IReadOnlyList<UserTaskVerificationHistoryDto> VerificationHistory { get; set; } = Array.Empty<UserTaskVerificationHistoryDto>();
}

/// <summary>One verification workflow action, newest first in <see cref="UserTaskDto.VerificationHistory"/>.</summary>
public sealed class UserTaskVerificationHistoryDto
{
    public Guid Id { get; set; }
    public Guid UserTaskId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string PreviousStatus { get; set; } = string.Empty;
    public string NewStatus { get; set; } = string.Empty;
    public string? Comments { get; set; }
    public Guid PerformedByUserId { get; set; }
    public string? PerformedByName { get; set; }
    public DateTime PerformedDate { get; set; }
    public IReadOnlyList<UserTaskAttachmentDto> Attachments { get; set; } = Array.Empty<UserTaskAttachmentDto>();
}

/// <summary>A proof file attached to a submission (dbo.DocumentStorage row).</summary>
public sealed record UserTaskAttachmentDto(Guid Id, string FileName, string? ContentType, string? FileSize);

/// <summary>A stored proof file and the task it belongs to (for the permission check before download).</summary>
public sealed record UserTaskAttachmentFile(Guid UserTaskId, string FileName, string? ContentType, string FilePath);

/// <summary>An uploaded proof file, already validated by the service.</summary>
public sealed record TaskVerificationFile(string FileName, long Length, Stream Content);

/// <summary>A deadline reminder due for a task's assignee (Milestone: a UserTaskDeadline value).</summary>
public sealed record TaskReminderCandidate(Guid TaskId, string Title, Guid AssignedToUserId, Guid AssignedByUserId,
    DateTime DueDate, TimeSpan? DueTime, string Milestone);

public enum CompleteTaskOutcome
{
    Completed,
    NotFound,
    NotAssignee,
    AlreadyCompleted,
}

public enum TaskWorkflowOutcome
{
    Done,
    NotFound,
    /// <summary>Start / submit: the caller is not the assignee.</summary>
    NotAssignee,
    /// <summary>Verify / request changes: the caller is neither the assigner nor an administrator, or is the assignee.</summary>
    NotVerifier,
    /// <summary>Self-assigned tasks have no separate verifier, so they do not use the workflow.</summary>
    SelfAssigned,
    /// <summary>The task is not in a status that allows the action (also a repeated / concurrent submission).</summary>
    InvalidState,
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
        DateTime dueDate, TimeSpan? dueTime, string? priority, CancellationToken token);

    /// <summary>
    /// Marks the task Completed only when <paramref name="callerUserId"/> is its assignee and it is still Pending
    /// (single conditional update, so repeated submissions cannot complete it twice), then notifies the assigner
    /// in the same transaction.
    /// </summary>
    Task<CompleteTaskOutcome> CompleteTaskAsync(Guid taskId, Guid callerUserId, CancellationToken token);

    // ─── Task verification workflow ───

    /// <summary>Tasks awaiting verification: those assigned by <paramref name="assignedByUserId"/>, or every one when null (administrators).</summary>
    Task<IReadOnlyList<UserTaskDto>> GetPendingVerificationTasksAsync(Guid? assignedByUserId, CancellationToken token);

    /// <summary>Assigned → In Progress, by the assignee only (conditional update + history row).</summary>
    Task<TaskWorkflowOutcome> StartTaskAsync(Guid taskId, Guid callerUserId, CancellationToken token);

    /// <summary>
    /// Assigned / In Progress (completes the task) / Completed / Changes Requested → Pending Verification, by the
    /// assignee only, never for a self-assigned task. Stores the proof files, the history row (with the notes) and the
    /// assigner's notification in one transaction; on failure nothing is saved and the new files are removed.
    /// </summary>
    Task<TaskWorkflowOutcome> SubmitForVerificationAsync(Guid taskId, Guid callerUserId, string? notes,
        IReadOnlyList<TaskVerificationFile> files, CancellationToken token);

    /// <summary>
    /// Pending Verification → Verified (<paramref name="approve"/>) or Changes Requested, by the assigner or an
    /// administrator, never the assignee. Conditional update, history row and the assignee's notification in one transaction.
    /// </summary>
    Task<TaskWorkflowOutcome> ReviewTaskAsync(Guid taskId, Guid callerUserId, bool callerIsAdmin, bool approve,
        string? comment, CancellationToken token);

    Task<UserTaskAttachmentFile?> GetTaskAttachmentAsync(Guid attachmentId, CancellationToken token);

    /// <summary>
    /// Deadline reminders due at <paramref name="now"/> (TCT local time) that have not been sent yet: active tasks still
    /// Pending (not completed, not submitted for verification), one milestone per task, for the assignee.
    /// </summary>
    Task<IReadOnlyList<TaskReminderCandidate>> GetDueTaskRemindersAsync(DateTime now, CancellationToken token);

    /// <summary>
    /// Sends one reminder notification and records it, in one transaction. False when it was already sent (also by a
    /// concurrent run) or the task has been completed / submitted / removed since it was listed.
    /// </summary>
    Task<bool> SendTaskReminderAsync(TaskReminderCandidate reminder, CancellationToken token);

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
