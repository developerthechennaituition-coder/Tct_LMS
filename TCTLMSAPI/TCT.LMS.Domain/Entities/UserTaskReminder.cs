using System;

namespace TCT.LMS.Domain.Entities;

/// <summary>
/// One deadline reminder sent for a task (My Calendar → Tasks). Table: dbo.UserTaskReminder
/// (TCTDatabase/DDL/UserTaskReminder.sql). The unique index on (UserTaskId, RecipientUserId, Milestone) makes each
/// reminder go out once, also after an API restart or when several API instances run the reminder job.
/// </summary>
public class UserTaskReminder
{
    public Guid Id { get; set; }
    public Guid UserTaskId { get; set; }
    public Guid RecipientUserId { get; set; }
    /// <summary>A <see cref="UserTaskDeadline"/> milestone: D-7 / D-1 / D0 / Overdue.</summary>
    public string Milestone { get; set; } = string.Empty;
    /// <summary>dbo.Notification.Id of the reminder.</summary>
    public Guid NotificationId { get; set; }
    /// <summary>UTC.</summary>
    public DateTime SentDate { get; set; }
}

/// <summary>
/// Deadline rules for tasks. Due date and due time are wall-clock values in TCT local (India) time, like the other
/// stored schedule times; callers pass "now" on the same clock. Nothing here is stored except the reminders sent.
/// </summary>
public static class UserTaskDeadline
{
    public const string SevenDaysBefore = "D-7";
    public const string DayBefore = "D-1";
    public const string DueDate = "D0";
    public const string Overdue = "Overdue";

    /// <summary>The overdue reminder is sent within this time after the deadline (a task overdue for longer before the
    /// job first saw it, e.g. before this feature existed, gets none).</summary>
    public static readonly TimeSpan OverdueReminderWindow = TimeSpan.FromDays(1);

    /// <summary>The moment the task becomes overdue: the due time on the due date, or the end of the due date for
    /// date-only tasks (the same day boundary the existing Overdue badge uses).</summary>
    public static DateTime Deadline(DateTime dueDate, TimeSpan? dueTime) =>
        dueTime.HasValue ? dueDate.Date + dueTime.Value : dueDate.Date.AddDays(1);

    /// <summary>
    /// The reminder due now, or null: D-7 on the day seven days before the due date, D-1 on the day before, D0 on the
    /// due date until the deadline, Overdue during the first day after the deadline. A milestone whose day has passed
    /// is not sent late. The caller only passes tasks that are not yet submitted or closed.
    /// </summary>
    public static string? ReminderMilestone(DateTime dueDate, TimeSpan? dueTime, DateTime now)
    {
        var deadline = Deadline(dueDate, dueTime);
        if (now >= deadline) return now < deadline + OverdueReminderWindow ? Overdue : null;
        return (dueDate.Date - now.Date).Days switch
        {
            7 => SevenDaysBefore,
            1 => DayBefore,
            0 => DueDate,
            _ => null,
        };
    }
}
