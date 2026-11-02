using System;

namespace TCT.LMS.Domain.Entities;

/// <summary>
/// A task assigned by one staff user to another (My Calendar → Tasks). Table: dbo.UserTask
/// (TCTDatabase/DDL/UserTask.sql). CreatedBy / CreatedDate / ModifiedBy / ModifiedDate / IsActive come from BaseEntity.
/// </summary>
public class UserTask : BaseEntity
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Guid AssignedToUserId { get; set; }
    public Guid AssignedByUserId { get; set; }
    public DateTime DueDate { get; set; }
    public string? Priority { get; set; }
    public string Status { get; set; } = UserTaskStatus.Pending;
    public DateTime? CompletedDate { get; set; }
    public Guid? CompletedByUserId { get; set; }
    /// <summary>Notification sent to the assignee when the task was created (null when self-assigned).</summary>
    public Guid? AssignedNotificationId { get; set; }
    /// <summary>Notification sent to the assigner when the task was completed (null until then, or when self-assigned).</summary>
    public Guid? CompletedNotificationId { get; set; }
    /// <summary>Time of day of the deadline (null = date-only, as for tasks created before deadline times existed).</summary>
    public TimeSpan? DueTime { get; set; }
    /// <summary>
    /// Verification workflow stage (UserTaskWorkflowStatus); null keeps the plain meaning of <see cref="Status"/>.
    /// Table changes: TCTDatabase/DDL/UserTask_Verification.sql.
    /// </summary>
    public string? WorkflowStatus { get; set; }
}

public static class UserTaskStatus
{
    public const string Pending = "Pending";
    public const string Completed = "Completed";
}

/// <summary>Values of UserTask.WorkflowStatus, plus the two derived from Status when it is null.</summary>
public static class UserTaskWorkflowStatus
{
    /// <summary>Derived: Status = Pending and no workflow stage yet.</summary>
    public const string Assigned = "Assigned";
    public const string InProgress = "InProgress";
    /// <summary>Derived: Status = Completed and not yet submitted for verification.</summary>
    public const string Completed = "Completed";
    public const string PendingVerification = "PendingVerification";
    public const string ChangesRequested = "ChangesRequested";
    public const string Verified = "Verified";

    /// <summary>The status a task is in, from its Status and stored WorkflowStatus (null for tasks created before the workflow).</summary>
    public static string Effective(string status, string? workflowStatus)
    {
        if (status == UserTaskStatus.Completed)
            return workflowStatus is PendingVerification or ChangesRequested or Verified ? workflowStatus : Completed;
        return workflowStatus == InProgress ? InProgress : Assigned;
    }
}

/// <summary>One verification workflow action on a task. Table: dbo.UserTaskVerificationHistory.</summary>
public class UserTaskVerificationHistory : BaseEntity
{
    public Guid Id { get; set; }
    public Guid UserTaskId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string PreviousStatus { get; set; } = string.Empty;
    public string NewStatus { get; set; } = string.Empty;
    public string? Comments { get; set; }
    public Guid PerformedByUserId { get; set; }
    public DateTime PerformedDate { get; set; }
    public Guid? NotificationId { get; set; }
}

public static class UserTaskVerificationAction
{
    public const string Started = "Started";
    public const string Submitted = "Submitted";
    public const string Resubmitted = "Resubmitted";
    public const string Verified = "Verified";
    public const string ChangesRequested = "ChangesRequested";
}
