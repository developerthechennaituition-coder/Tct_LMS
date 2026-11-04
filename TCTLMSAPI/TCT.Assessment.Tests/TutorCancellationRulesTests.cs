using Rules = TCT.LMS.Application.Services.TutorCancellationRules;

namespace TCT.Assessment.Tests;

public class TutorCancellationRulesTests
{
    private static List<(string Name, decimal? Value)> DefaultRows() => new()
    {
        (Rules.WeeksPerMonthName, 4),
        (Rules.AllowanceName(1), 1), (Rules.AllowanceName(2), 1), (Rules.AllowanceName(3), 2), (Rules.AllowanceName(4), 2),
        (Rules.AllowanceName(5), 3), (Rules.AllowanceName(6), 3), (Rules.AllowanceName(7), 3),
        (Rules.DeductionPercentName, 50),
    };

    private static Rules.Config DefaultConfig()
    {
        var config = Rules.ReadConfig(DefaultRows(), out var error);
        Assert.Null(error);
        return config!;
    }

    [Theory]
    [InlineData(1, 4, 1)]
    [InlineData(2, 8, 1)]
    [InlineData(3, 12, 2)]
    [InlineData(4, 16, 2)]
    [InlineData(5, 20, 3)]
    [InlineData(6, 24, 3)]
    [InlineData(7, 28, 3)]
    public void EachWeeklyCountHasItsMonthlyClassesAndAllowance(int weekly, int monthly, int allowed)
    {
        var config = DefaultConfig();
        Assert.Equal(monthly, Rules.MonthlyClasses(config, weekly));
        Assert.Equal(allowed, Rules.Allowance(config, weekly));
    }

    [Fact]
    public void ChangedConfigurationIsUsedOnTheNextEvaluation()
    {
        var rows = DefaultRows();
        rows[rows.FindIndex(r => r.Name == Rules.AllowanceName(3))] = (Rules.AllowanceName(3), 4);
        rows[rows.FindIndex(r => r.Name == Rules.WeeksPerMonthName)] = (Rules.WeeksPerMonthName, 5);
        var config = Rules.ReadConfig(rows, out var error);
        Assert.Null(error);
        Assert.Equal(4, Rules.Allowance(config!, 3));
        Assert.Equal(15, Rules.MonthlyClasses(config!, 3));
    }

    [Theory]
    [InlineData(0, true, 1)]
    [InlineData(1, false, 0)]   // 2 a week allows 1: the second cancellation is refused
    [InlineData(2, false, 0)]
    public void TutorMayCancelOnlyWithinTheAllowance(int alreadyUsed, bool canCancel, int remaining)
    {
        var usage = Rules.Evaluate(DefaultConfig(), null, weeklyClasses: 2, usedThisMonth: alreadyUsed);
        Assert.Equal(canCancel, usage.CanCancel);
        Assert.Equal(remaining, usage.Remaining);
        if (!canCancel) Assert.Contains($"used {alreadyUsed} of 1", Rules.BlockedMessage(usage, new DateTime(2026, 11, 10)));
    }

    [Fact]
    public void FiveAWeekAllowsThreeCancellations()
    {
        var config = DefaultConfig();
        Assert.True(Rules.Evaluate(config, null, 5, 2).CanCancel);
        Assert.False(Rules.Evaluate(config, null, 5, 3).CanCancel);
    }

    [Theory]
    [InlineData(8, 3)]
    [InlineData(12, 3)]
    [InlineData(40, 3)]   // a tutor with many students' classes uses the highest band at or below the count
    public void MoreThanSevenWeeklyClassesUseTheHighestBandInsteadOfBlocking(int weekly, int allowed)
    {
        var usage = Rules.Evaluate(DefaultConfig(), null, weekly, 0);
        Assert.True(usage.CanCancel);
        Assert.Equal(allowed, usage.Allowed);
        Assert.Equal(7, Rules.BandFor(DefaultConfig(), weekly));
    }

    [Fact]
    public void AnAddedHigherBandAppliesFromItsStartUpward()
    {
        var rows = DefaultRows();
        rows.Add((Rules.AllowanceName(10), 5));
        rows.Add((Rules.AllowanceName(20), 8));
        var config = Rules.ReadConfig(rows, out var error);
        Assert.Null(error);
        Assert.Equal(3, Rules.Allowance(config!, 9));    // 7-9 a week: the 7 band
        Assert.Equal(5, Rules.Allowance(config!, 10));   // 10-19: the added 10 band
        Assert.Equal(5, Rules.Allowance(config!, 19));
        Assert.Equal(8, Rules.Allowance(config!, 25));   // 20 and above
        Assert.Equal(1, Rules.Allowance(config!, 1));
    }

    [Fact]
    public void HigherBandsAreValidatedLikeTheOthers()
    {
        Assert.Contains("more than the 40 classes", Rules.ValidateValue(Rules.AllowanceName(10), 41, 4));
        Assert.Null(Rules.ValidateValue(Rules.AllowanceName(150), 10, 4));
        Assert.True(Rules.IsRuleThreshold(Rules.AllowanceName(150)));
        Assert.False(Rules.IsRuleThreshold(Rules.AllowanceName(201)));
    }

    [Fact]
    public void NoWeeklyClassesBlocksCancellation()
    {
        var none = Rules.Evaluate(DefaultConfig(), null, 0, 0);
        Assert.False(none.CanCancel);
        Assert.Contains("Only regular weekly classes", Rules.BlockedMessage(none, DateTime.Today));
    }

    [Theory]
    [InlineData(1009006, true)]   // Class Re-Scheduled (class status)
    [InlineData(20023, true)]     // Class Re-Scheduled (follow-up status)
    [InlineData(1009004, false)]  // Request for Re-schedule: not re-scheduled yet
    [InlineData(1009001, false)]
    [InlineData(null, false)]
    public void OnlyReScheduledStatusesCountAsTheRescheduleFlow(int? code, bool expected)
    {
        Assert.Equal(expected, Rules.IsRescheduledStatusCode(code));
    }

    [Fact]
    public void InvalidConfigurationBlocksInsteadOfGuessing()
    {
        var usage = Rules.Evaluate(null, "TutorCancelWeeksPerMonth is missing or inactive", 3, 0);
        Assert.False(usage.CanCancel);
        Assert.Contains("invalid", Rules.BlockedMessage(usage, DateTime.Today));
    }

    [Fact]
    public void AllowanceResetsOnTheFirstOfTheCalendarMonth()
    {
        Assert.Equal(new DateTime(2026, 11, 1), Rules.MonthStart(new DateTime(2026, 11, 30)));
        Assert.Equal(new DateTime(2026, 12, 1), Rules.NextMonthStart(new DateTime(2026, 11, 30)));
        Assert.Equal(new DateTime(2027, 1, 1), Rules.NextMonthStart(new DateTime(2026, 12, 31)));
    }

    [Fact]
    public void WeeklyCountIsTheDistinctWeekdayAndTimeSlots()
    {
        // Mondays 17:00 and Thursdays 18:30 for four weeks, plus a second Monday class at 19:00 in one week.
        var starts = new List<DateTime>();
        for (var week = 0; week < 4; week++)
        {
            starts.Add(new DateTime(2026, 11, 2, 17, 0, 0).AddDays(7 * week));
            starts.Add(new DateTime(2026, 11, 5, 18, 30, 0).AddDays(7 * week));
        }
        Assert.Equal(2, Rules.WeeklyClassCount(starts));
        starts.Add(new DateTime(2026, 11, 9, 19, 0, 0));
        Assert.Equal(3, Rules.WeeklyClassCount(starts));
        Assert.Equal(0, Rules.WeeklyClassCount(Array.Empty<DateTime>()));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("TutorCancelWeeksPerMonth")]
    [InlineData("TutorCancelUnrescheduledDeductionPercent")]
    [InlineData("TutorCancelAllowedPerMonth_Weekly4")]
    public void MissingDuplicateOrInvalidRowsAreReported(string? broken)
    {
        var rows = DefaultRows();
        if (broken == null) rows.RemoveAll(r => r.Name == Rules.AllowanceName(7));
        else rows.Add((broken, rows.First(r => r.Name == broken).Value));
        Assert.Null(Rules.ReadConfig(rows, out var error));
        Assert.Contains(broken == null ? "TutorCancelAllowedPerMonth_Weekly7 is missing" : $"{broken} is configured more than once", error);
    }

    [Theory]
    [InlineData("TutorCancelWeeksPerMonth", 0, null, "between 1 and 5")]
    [InlineData("TutorCancelWeeksPerMonth", 4.5, null, "whole number")]
    [InlineData("TutorCancelUnrescheduledDeductionPercent", 120, null, "between 0 and 100")]
    [InlineData("TutorCancelAllowedPerMonth_Weekly2", -1, 4, "negative")]
    [InlineData("TutorCancelAllowedPerMonth_Weekly2", 9, 4, "more than the 8 classes")]
    [InlineData("TutorCancelAllowedPerMonth_Weekly2", 1.5, 4, "whole number")]
    public void InvalidValuesAreRefused(string name, double value, int? weeks, string expected)
    {
        Assert.Contains(expected, Rules.ValidateValue(name, (decimal)value, weeks));
    }

    [Fact]
    public void ValidValuesAndOtherThresholdsPass()
    {
        Assert.Null(Rules.ValidateValue(Rules.AllowanceName(2), 8, 4));
        Assert.Null(Rules.ValidateValue(Rules.DeductionPercentName, 50, null));
        Assert.Null(Rules.ValidateValue(Rules.DeductionPercentName, 37.5m, null));
        Assert.False(Rules.IsRuleThreshold("CancelClassRatio"));
        Assert.False(Rules.IsRuleThreshold("TutorAssignCooldownDaysMid"));
        Assert.Null(Rules.WeeklyBandOf("TutorCancelAllowedPerMonth_WeeklyX"));
    }

    [Fact]
    public void DeductionIsTheConfiguredShareOfTheClassPay()
    {
        var start = new DateTime(2026, 11, 3, 17, 0, 0);
        Assert.Equal(200m, Rules.DeductionAmount(start, start.AddHours(1), 400m, 50m));
        // 70 minutes round up to 1h15m (payroll rule): 1.25 x 400 x 50%.
        Assert.Equal(250m, Rules.DeductionAmount(start, start.AddMinutes(70), 400m, 50m));
        Assert.Equal(0m, Rules.DeductionAmount(start, start.AddHours(1), 400m, 0m));
    }

    [Fact]
    public void OnlyUnrescheduledTutorCancellationsAreDeductedOnce()
    {
        var classDate = new DateTime(2026, 11, 20);
        Rules.DeductionDecision Decide(string category = "tutor", bool counts = true, bool active = true, DateTime? rescheduledAt = null,
            long? invoice = null, int year = 2026, int month = 11, DateTime? today = null, bool stillCancelled = true,
            bool approvedWithoutClass = false) =>
            Rules.DecideDeduction(category, counts, active, classDate, rescheduledAt, invoice, year, month,
                today ?? new DateTime(2026, 12, 3), stillCancelled, approvedWithoutClass);
        bool Due(string category = "tutor", bool counts = true, bool active = true, DateTime? rescheduledAt = null,
            long? invoice = null, int year = 2026, int month = 11, DateTime? today = null) =>
            Decide(category, counts, active, rescheduledAt, invoice, year, month, today) == Rules.DeductionDecision.Deduct;

        Assert.True(Due());                                                   // not re-scheduled by 30 Nov
        Assert.False(Due(rescheduledAt: new DateTime(2026, 11, 30, 23, 0, 0))); // re-scheduled in time
        Assert.True(Due(rescheduledAt: new DateTime(2026, 12, 1, 9, 0, 0)));   // linked only after the deadline
        Assert.False(Due(invoice: 42));                                       // already deducted: never twice
        Assert.False(Due(category: "student", counts: false));                // student cancellations are not deducted
        Assert.False(Due(active: false));                                     // cancellation withdrawn
        Assert.False(Due(month: 10));                                         // October payroll: not due yet
        Assert.True(Due(month: 12));                                          // missed in November: next payslip
        Assert.False(Due(today: new DateTime(2026, 11, 25)));                 // November not over: still time to re-schedule
        Assert.True(Due(today: new DateTime(2026, 12, 1)));                   // deadline passed at the end of 30 Nov
    }

    [Fact]
    public void NoDeductionWhenItIsNotCertainTheClassWasNotRescheduled()
    {
        var classDate = new DateTime(2026, 11, 20);
        var today = new DateTime(2026, 12, 3);
        // No make-up linked, but the class was changed after cancelling (e.g. Re-Scheduled without a linked class, or
        // removed by a permanent re-schedule): uncertain, so never deducted.
        Assert.Equal(Rules.DeductionDecision.Uncertain, Rules.DecideDeduction("tutor", true, true, classDate, null, null, 2026, 11, today,
            classStillCancelledByTutor: false, makeupApprovedWithoutClass: false));
        // A make-up was approved but its class could not be identified: uncertain.
        Assert.Equal(Rules.DeductionDecision.Uncertain, Rules.DecideDeduction("tutor", true, true, classDate, null, null, 2026, 11, today,
            classStillCancelledByTutor: true, makeupApprovedWithoutClass: true));
        // Certain: still the tutor's Class Cancelled and nothing approved.
        Assert.Equal(Rules.DeductionDecision.Deduct, Rules.DecideDeduction("tutor", true, true, classDate, null, null, 2026, 11, today,
            classStillCancelledByTutor: true, makeupApprovedWithoutClass: false));
        // A linked make-up decides by its date, whatever the class's status now.
        Assert.Equal(Rules.DeductionDecision.NotDue, Rules.DecideDeduction("tutor", true, true, classDate, new DateTime(2026, 11, 25), null,
            2026, 11, today, classStillCancelledByTutor: false, makeupApprovedWithoutClass: false));
        // Not due yet (November not over) is never reported as uncertain.
        Assert.Equal(Rules.DeductionDecision.NotDue, Rules.DecideDeduction("tutor", true, true, classDate, null, null, 2026, 11,
            new DateTime(2026, 11, 25), classStillCancelledByTutor: false, makeupApprovedWithoutClass: true));
    }

    [Fact]
    public void NotificationExplainsTheMissedRescheduleAndTheDeduction()
    {
        var message = Rules.DeductionNotificationMessage("Asha", "Maths", new DateTime(2026, 11, 20, 17, 0, 0), 50m, 200m, "INV-1");
        Assert.Contains("not re-scheduled by the end of November 2026", message);
        Assert.Contains("50%", message);
        Assert.Contains("200.00 INR", message);
        Assert.Contains("INV-1", message);
    }

    [Fact]
    public void SummaryShowsUsedRemainingAndPendingMakeups()
    {
        var usage = Rules.Evaluate(DefaultConfig(), null, 3, 1);
        var text = Rules.SummaryMessage(usage, new DateTime(2026, 11, 10), pendingMakeups: 1, deductionPercent: 50m);
        Assert.Contains("used 1 of 2", text);
        Assert.Contains("1 remaining", text);
        Assert.Contains("1 cancelled class(es) still need a make-up", text);
    }
}
