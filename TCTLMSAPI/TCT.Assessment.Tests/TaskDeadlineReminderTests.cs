using TCT.LMS.Domain.Entities;

namespace TCT.Assessment.Tests;

// My Calendar → Tasks deadline reminders: which milestone is due at a given moment (TCT local time). Duplicate
// prevention (unique index) and the excluded statuses are enforced by MyCalendarRepository against the database.
public class TaskDeadlineReminderTests
{
    private static readonly DateTime DueDate = new(2026, 11, 20);
    private static readonly TimeSpan FivePm = new(17, 0, 0);

    private static string? At(string now, TimeSpan? dueTime = null) =>
        UserTaskDeadline.ReminderMilestone(DueDate, dueTime, DateTime.Parse(now));

    [Theory]
    [InlineData("2026-11-13 00:00", "D-7")]
    [InlineData("2026-11-13 23:59", "D-7")]
    [InlineData("2026-11-19 08:00", "D-1")]
    [InlineData("2026-11-19 23:59", "D-1")]
    [InlineData("2026-11-20 00:00", "D0")]
    [InlineData("2026-11-20 16:59", "D0")]
    public void SendsD7D1AndDueDateRemindersOnTheirDays(string now, string expected) =>
        Assert.Equal(expected, At(now, FivePm));

    [Theory]
    [InlineData("2026-11-12 23:59")] // D-8
    [InlineData("2026-11-14 09:00")] // D-6 … D-2: no daily reminder
    [InlineData("2026-11-16 09:00")]
    [InlineData("2026-11-18 23:59")]
    public void SendsNothingBetweenMilestones(string now) => Assert.Null(At(now, FivePm));

    [Theory]
    [InlineData("2026-11-20 17:00")] // exactly at the deadline
    [InlineData("2026-11-20 23:00")]
    [InlineData("2026-11-21 16:59")]
    public void SendsOverdueOnceTheDueTimeHasPassed(string now) => Assert.Equal("Overdue", At(now, FivePm));

    [Fact]
    public void DoesNotSendOverdueForTasksOverdueForMoreThanADay() => Assert.Null(At("2026-11-21 17:00", FivePm));

    [Theory]
    [InlineData("2026-11-20 23:59", "D0")]       // date-only: due until the end of the due date
    [InlineData("2026-11-21 00:00", "Overdue")]  // same day boundary as the existing Overdue badge
    [InlineData("2026-11-21 23:59", "Overdue")]
    [InlineData("2026-11-22 00:00", null)]
    public void DateOnlyTasksBecomeOverdueAfterTheDueDate(string now, string? expected) => Assert.Equal(expected, At(now));

    [Fact]
    public void DeadlineUsesTheDueTimeOrTheEndOfTheDueDate()
    {
        Assert.Equal(new DateTime(2026, 11, 20, 17, 0, 0), UserTaskDeadline.Deadline(DueDate, FivePm));
        Assert.Equal(new DateTime(2026, 11, 21), UserTaskDeadline.Deadline(DueDate, null));
    }

    [Fact]
    public void MidnightDueTimeIsOverdueFromTheStartOfTheDueDate()
    {
        Assert.Equal("D-1", At("2026-11-19 23:59", TimeSpan.Zero));
        Assert.Equal("Overdue", At("2026-11-20 00:00", TimeSpan.Zero));
    }
}
