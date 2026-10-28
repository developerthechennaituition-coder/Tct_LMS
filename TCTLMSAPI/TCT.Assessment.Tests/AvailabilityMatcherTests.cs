using System.ComponentModel.DataAnnotations;
using TCT.LMS.Application.Services;
using TCT.LMS.DTOs.User;

namespace TCT.Assessment.Tests;

public class AvailabilityMatcherTests
{
    private static readonly DateTime Monday = new(2026, 10, 12);
    private static UserAvailabilityRequestDto Window(int start, int end, bool available = true) => new()
    {
        IsActive = true, IsRecurring = true, IsAvailable = available, DayOfWeek = "Monday",
        StartDate = Monday.AddDays(-7), StartTime = Monday.AddHours(start), EndTime = Monday.AddHours(end)
    };

    [Fact] public void RecurringSlotUsesSelectedDateNotOriginalDate()
    {
        var slot = Assert.Single(AvailabilityMatcher.ForDate(new[] { Window(9, 12) }, Monday.AddDays(7)));
        Assert.Equal(Monday.AddDays(7).AddHours(9), slot.StartTime);
        Assert.Equal(Monday.AddDays(7).AddHours(12), slot.EndTime);
    }

    [Fact] public void DateRangesAndWeekdayAreRespected()
    {
        var row = Window(9, 12); row.EndDate = Monday;
        Assert.Empty(AvailabilityMatcher.ForDate(new[] { row }, Monday.AddDays(7)));
        Assert.Empty(AvailabilityMatcher.ForDate(new[] { row }, Monday.AddDays(-14)));
        Assert.Empty(AvailabilityMatcher.ForDate(new[] { row }, Monday.AddDays(1)));
        Assert.Single(AvailabilityMatcher.ForDate(new[] { row }, Monday));
    }

    [Fact] public void UnavailableExceptionSplitsRatherThanAddsAWindow()
    {
        var exception = Window(10, 11, false);
        exception.IsRecurring = false; exception.StartDate = Monday; exception.DayOfWeek = null!;
        var slots = AvailabilityMatcher.ForDate(new[] { Window(9, 12), exception }, Monday);
        Assert.Equal(2, slots.Count);
        Assert.Equal(Monday.AddHours(10), slots[0].EndTime);
        Assert.Equal(Monday.AddHours(11), slots[1].StartTime);
        Assert.Single(AvailabilityMatcher.ForDate(new[] { Window(9, 12), exception }, Monday.AddDays(7)));
    }

    [Fact] public void OverlappingAndAdjacentWindowsAreMerged()
    {
        var slot = Assert.Single(AvailabilityMatcher.ForDate(new[] { Window(9, 11), Window(10, 12), Window(12, 13) }, Monday));
        Assert.Equal(Monday.AddHours(9), slot.StartTime);
        Assert.Equal(Monday.AddHours(13), slot.EndTime);
    }

    [Fact] public void InactiveAndReversedWindowsAreIgnored()
    {
        var inactive = Window(9, 12); inactive.IsActive = false;
        Assert.Empty(AvailabilityMatcher.ForDate(new[] { inactive, Window(12, 9) }, Monday));
    }

    [Fact] public void RangeReturnsEachMatchingDateWithItsOwnExceptions()
    {
        var exception = Window(9, 12, false);
        exception.IsRecurring = false; exception.StartDate = Monday.AddDays(7); exception.DayOfWeek = null!;
        var slots = AvailabilityMatcher.ForRange(new[] { Window(9, 12), exception }, Monday, Monday.AddDays(13));
        var slot = Assert.Single(slots); // Monday 12-Oct only: 19-Oct is blocked, other days are not Monday
        Assert.Equal(Monday.AddHours(9), slot.StartTime);
        Assert.Empty(AvailabilityMatcher.ForRange(new[] { Window(9, 12) }, Monday.AddDays(1), Monday.AddDays(6)));
    }

    [Fact] public void BookedClassesAreCutOutOfFreeSlots()
    {
        var free = AvailabilityMatcher.ForDate(new[] { Window(17, 22) }, Monday);
        var booked = new[] { new AvailableTimeSlot(DayOfWeek.Monday, Monday.AddHours(19), Monday.AddHours(20), "Monday"),
            new AvailableTimeSlot(DayOfWeek.Tuesday, Monday.AddDays(1).AddHours(18), Monday.AddDays(1).AddHours(19), "Tuesday") };
        var slots = AvailabilityMatcher.Subtract(free, booked);
        Assert.Equal(2, slots.Count); // 17-19 and 20-22; the Tuesday class does not touch Monday
        Assert.Equal((Monday.AddHours(17), Monday.AddHours(19)), (slots[0].StartTime, slots[0].EndTime));
        Assert.Equal((Monday.AddHours(20), Monday.AddHours(22)), (slots[1].StartTime, slots[1].EndTime));
        Assert.Empty(AvailabilityMatcher.Subtract(free, new[] { new AvailableTimeSlot(DayOfWeek.Monday, Monday.AddHours(16), Monday.AddHours(23), "Monday") }));
    }

    [Fact] public void ComparisonSplitsIntoBothFreeAndOneSideOnly()
    {
        var student = AvailabilityMatcher.ForDate(new[] { Window(17, 22) }, Monday);          // 5 PM - 10 PM
        var tutor = AvailabilityMatcher.ForDate(new[] { Window(9, 12), Window(19, 21) }, Monday); // 9-12, 7-9 PM
        var common = Assert.Single(AvailabilityMatcher.Intersect(student, tutor));
        Assert.Equal((Monday.AddHours(19), Monday.AddHours(21)), (common.StartTime, common.EndTime));
        var studentOnly = AvailabilityMatcher.Subtract(student, tutor);
        Assert.Equal(new[] { (17, 19), (21, 22) }, studentOnly.Select(s => (s.StartTime.Hour, s.EndTime.Hour)));
        var tutorOnly = Assert.Single(AvailabilityMatcher.Subtract(tutor, student));
        Assert.Equal((9, 12), (tutorOnly.StartTime.Hour, tutorOnly.EndTime.Hour));
        Assert.Empty(AvailabilityMatcher.Intersect(student, AvailabilityMatcher.ForDate(new[] { Window(9, 12) }, Monday)));
    }

    [Theory]
    [InlineData("Monday", 9, 10, true)]
    [InlineData("monday", 9, 10, true)]
    [InlineData("Notaday", 9, 10, false)]
    [InlineData("99", 9, 10, false)]
    [InlineData("Monday", 10, 9, false)]
    [InlineData("Monday", 10, 10, false)]
    public void SlotValidation(string day, int start, int end, bool valid)
    {
        var request = new UserTimeSlots { UserId = Guid.NewGuid(), IsRecurring = true, StartDate = Monday,
            SlotList = new() { new Slot { Day = day, StartTime = TimeSpan.FromHours(start), EndTime = TimeSpan.FromHours(end) } } };
        Assert.Equal(valid, !request.Validate(new ValidationContext(request)).Any());
    }
}
