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
}

public static class UserTaskStatus
{
    public const string Pending = "Pending";
    public const string Completed = "Completed";
}
