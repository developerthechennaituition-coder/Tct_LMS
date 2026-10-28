using TCT.LMS.Application.Services;

namespace TCT.Assessment.Tests;

public class WeeklyDayChangePlannerTests
{
    private static readonly DateTime Monday = new(2026, 10, 26);
    private static readonly TimeSpan Seven = TimeSpan.FromHours(19), Eight = TimeSpan.FromHours(20);

    [Theory]
    [InlineData(1, 1)]
    [InlineData(2, 2)]
    [InlineData(3, 3)]
    [InlineData(4, 4)]
    public void TemporaryAddsOneThursdayPerWeek(int weeks, int expected)
    {
        var last = WeeklyDayChangePlanner.LastDate(Monday, weeks, DateTime.MaxValue);
        var slots = WeeklyDayChangePlanner.Occurrences(Monday, last, new[] { DayOfWeek.Thursday }, Seven, Eight);
        Assert.Equal(expected, slots.Count);
        Assert.All(slots, s => Assert.Equal(DayOfWeek.Thursday, s.Start.DayOfWeek));
        Assert.Equal(Monday.AddDays(3) + Seven, slots[0].Start);
        Assert.Equal(Monday.AddDays(3) + Eight, slots[0].End);
    }

    [Fact]
    public void OneWeekStartingThursdayCoversOnlyThatThursday()
    {
        var thursday = Monday.AddDays(3);
        var last = WeeklyDayChangePlanner.LastDate(thursday, 1, DateTime.MaxValue);
        Assert.Equal(thursday.AddDays(6), last);
        Assert.Single(WeeklyDayChangePlanner.Occurrences(thursday, last, new[] { DayOfWeek.Thursday }, Seven, Eight));
    }

    [Fact]
    public void PermanentRunsUntilTheGivenDate()
    {
        var until = new DateTime(2026, 11, 30);
        var last = WeeklyDayChangePlanner.LastDate(Monday, WeeklyDayChangePlanner.PermanentWeeks, until);
        Assert.Equal(until, last);
        // Thursdays 29 Oct .. 26 Nov = 5 classes; with Saturday as well = 10.
        Assert.Equal(5, WeeklyDayChangePlanner.Occurrences(Monday, last, new[] { DayOfWeek.Thursday }, Seven, Eight).Count);
        Assert.Equal(10, WeeklyDayChangePlanner.Occurrences(Monday, last, new[] { DayOfWeek.Thursday, DayOfWeek.Saturday }, Seven, Eight).Count);
    }

    [Theory]
    [InlineData(new DayOfWeek[0], 19, 20, 1, 0, "Select at least one day.")]
    [InlineData(new[] { DayOfWeek.Thursday }, 20, 19, 1, 0, "End time must be later than start time.")]
    [InlineData(new[] { DayOfWeek.Thursday }, 19, 20, 5, 0, "Choose 1 to 4 weeks, or Permanent.")]
    [InlineData(new[] { DayOfWeek.Thursday }, 19, 20, 1, -1, "The start date cannot be in the past.")]
    [InlineData(new[] { DayOfWeek.Thursday }, 19, 20, 0, 0, null)]
    public void Validation(DayOfWeek[] days, int start, int end, int weeks, int fromOffset, string? expected)
    {
        Assert.Equal(expected, WeeklyDayChangePlanner.Validate(Monday.AddDays(fromOffset), days,
            TimeSpan.FromHours(start), TimeSpan.FromHours(end), weeks, Monday));
    }
}
