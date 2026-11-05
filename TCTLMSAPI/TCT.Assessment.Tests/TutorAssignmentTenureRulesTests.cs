using TCT.LMS.Domain;
using TCT.LMS.Domain.Entities;
using Rules = TCT.LMS.Application.Services.TutorAssignmentThresholdRules;

namespace TCT.Assessment.Tests;

public class TutorAssignmentTenureRulesTests
{
    // 10:00 UTC = 15:30 IST on 3 Nov 2026.
    private static readonly DateTime Now = new(2026, 11, 3, 10, 0, 0, DateTimeKind.Utc);
    private static readonly DateTime Today = new(2026, 11, 3);

    private static Dictionary<string, IReadOnlyList<decimal?>> ValidRows() => new()
    {
        [Rules.TenureBand1DaysName] = new decimal?[] { 15 },
        [Rules.TenureBand1MaxStudentsName] = new decimal?[] { 1 },
        [Rules.TenureBand2DaysName] = new decimal?[] { 30 },
        [Rules.TenureBand2MaxStudentsName] = new decimal?[] { 3 },
        [Rules.TenureBand3DaysName] = new decimal?[] { 60 },
        [Rules.TenureBand3MaxStudentsName] = new decimal?[] { 6 },
        [Rules.TenureBand4DaysName] = new decimal?[] { 90 },
        [Rules.TenureBand4MaxStudentsName] = new decimal?[] { 10 },
        [Rules.TenureStandardMaxStudentsName] = new decimal?[] { 15 },
        [Rules.TenureSuperAdminMaxStudentsName] = new decimal?[] { 20 },
        [Rules.TenureNewBadgeDaysName] = new decimal?[] { 30 },
    };

    private static Rules.TenureConfig Config() => Rules.ReadTenureConfig(ValidRows(), out _)!;

    private static Rules.TenureStatus Tenure(int daysSinceJoining, int activeStudents, bool superAdmin = false) =>
        Rules.EvaluateTenure(Config(), null, Today.AddDays(-daysSinceJoining), null, activeStudents, superAdmin, Now);

    private static readonly Rules.Decision NoOtherRule = new(Rules.Outcome.Allowed, null, null, false, Array.Empty<string>());

    // ── Configuration ────────────────────────────────────────────────────

    [Fact]
    public void ValidConfigurationIsRead()
    {
        var config = Rules.ReadTenureConfig(ValidRows(), out var error);
        Assert.Null(error);
        Assert.Equal(new[] { (15, 1), (30, 3), (60, 6), (90, 10) }, config!.Bands.Select(b => (b.Days, b.MaxStudents)));
        Assert.Equal((15, 20, 30), (config.StandardMaxStudents, config.SuperAdminMaxStudents, config.NewBadgeDays));
    }

    [Theory]
    [InlineData("missing", "TutorTenureBand2Days is missing or inactive")]
    [InlineData("duplicate", "TutorTenureBand2Days is configured more than once")]
    [InlineData("zero", "TutorTenureBand2Days must be a positive whole number")]
    [InlineData("fraction", "TutorTenureBand2Days must be a positive whole number")]
    [InlineData("days not increasing", "TutorTenureBand2Days must be greater than TutorTenureBand1Days")]
    [InlineData("limit decreasing", "TutorTenureBand3MaxStudents cannot be less than TutorTenureBand2MaxStudents")]
    [InlineData("standard below band 4", "TutorTenureStandardMaxStudents cannot be less than TutorTenureBand4MaxStudents")]
    [InlineData("cap below standard", "TutorTenureSuperAdminMaxStudents cannot be less than TutorTenureStandardMaxStudents")]
    public void InvalidConfigurationIsRejectedWithTheReason(string problem, string expected)
    {
        var rows = ValidRows();
        switch (problem)
        {
            case "missing": rows.Remove(Rules.TenureBand2DaysName); break;
            case "duplicate": rows[Rules.TenureBand2DaysName] = new decimal?[] { 30, 30 }; break;
            case "zero": rows[Rules.TenureBand2DaysName] = new decimal?[] { 0 }; break;
            case "fraction": rows[Rules.TenureBand2DaysName] = new decimal?[] { 29.5m }; break;
            case "days not increasing": rows[Rules.TenureBand2DaysName] = new decimal?[] { 15 }; break;
            case "limit decreasing": rows[Rules.TenureBand3MaxStudentsName] = new decimal?[] { 2 }; break;
            case "standard below band 4": rows[Rules.TenureStandardMaxStudentsName] = new decimal?[] { 9 }; break;
            case "cap below standard": rows[Rules.TenureSuperAdminMaxStudentsName] = new decimal?[] { 14 }; break;
        }
        Assert.Null(Rules.ReadTenureConfig(rows, out var error));
        Assert.Contains(expected, error);
    }

    [Fact]
    public void NoTenureRowsAtAllIsReportedInOneLine()
    {
        Assert.Null(Rules.ReadTenureConfig(new Dictionary<string, IReadOnlyList<decimal?>>(), out var error));
        Assert.Equal("the TutorAssignTenure threshold rows are missing", error);
    }

    [Fact]
    public void MissingConfigurationBlocksEveryRoleIncludingSuperAdmin()
    {
        var status = Rules.EvaluateTenure(null, "TutorTenureBand1Days is missing or inactive", Today.AddDays(-200), null, 0, true, Now);
        Assert.Equal(Rules.Outcome.Blocked, status.Outcome);
        Assert.Contains("not configured correctly (TutorTenureBand1Days is missing or inactive)", status.Message);
    }

    // ── Bands and limits ─────────────────────────────────────────────────

    [Theory]
    [InlineData(0, 0, Rules.Outcome.Allowed, "Under 15 days", 1)]
    [InlineData(14, 1, Rules.Outcome.Blocked, "Under 15 days", 1)]
    [InlineData(15, 2, Rules.Outcome.Allowed, "15–29 days", 3)]
    [InlineData(29, 3, Rules.Outcome.Blocked, "15–29 days", 3)]
    [InlineData(30, 5, Rules.Outcome.Allowed, "30–59 days", 6)]
    [InlineData(59, 6, Rules.Outcome.Blocked, "30–59 days", 6)]
    [InlineData(60, 9, Rules.Outcome.Allowed, "60–89 days", 10)]
    [InlineData(89, 10, Rules.Outcome.Blocked, "60–89 days", 10)]
    [InlineData(90, 14, Rules.Outcome.Allowed, "90+ days", 15)]
    [InlineData(90, 15, Rules.Outcome.NeedsSuperAdmin, "90+ days", 15)]
    [InlineData(400, 19, Rules.Outcome.NeedsSuperAdmin, "90+ days", 15)]
    [InlineData(400, 20, Rules.Outcome.Blocked, "90+ days", 15)]
    public void EachBandAllowsUpToItsLimit(int days, int activeStudents, Rules.Outcome expected, string band, int limit)
    {
        var status = Tenure(days, activeStudents);
        Assert.Equal(expected, status.Outcome);
        Assert.Equal(band, status.Band);
        Assert.Equal(limit, status.Limit);
        Assert.Equal(days, status.DaysSinceJoining);
        Assert.Equal(activeStudents, status.ActiveStudents);
    }

    [Theory]
    [InlineData(15, Rules.Outcome.Allowed)]
    [InlineData(19, Rules.Outcome.Allowed)]
    [InlineData(20, Rules.Outcome.Blocked)]
    [InlineData(25, Rules.Outcome.Blocked)]
    public void SuperAdminAssignsDirectlyUpToTheCapWhichBlocksEveryone(int activeStudents, Rules.Outcome expected)
    {
        Assert.Equal(expected, Tenure(120, activeStudents, superAdmin: true).Outcome);
    }

    [Theory]
    [InlineData(10, 1)]
    [InlineData(45, 6)]
    public void SuperAdminIsStillBoundByTheEarlyTenureBands(int days, int activeStudents)
    {
        Assert.Equal(Rules.Outcome.Blocked, Tenure(days, activeStudents, superAdmin: true).Outcome);
    }

    [Fact]
    public void BlockedMessagesGiveTheReason()
    {
        Assert.Equal("This tutor has reached the assignment limit for tutors Under 15 days since joining: 1 active students (currently 1).",
            Tenure(3, 1).Message);
        Assert.Equal("This tutor has 20 active students, the maximum of 20. The tutor is unavailable for new assignments until a student becomes inactive.",
            Tenure(200, 20).Message);
    }

    [Fact]
    public void FreedSlotMakesTheTutorAvailableAgain()
    {
        Assert.Equal(Rules.Outcome.Blocked, Tenure(200, 20).Outcome);
        Assert.Equal(Rules.Outcome.NeedsSuperAdmin, Tenure(200, 19).Outcome);
        Assert.Equal(Rules.Outcome.Allowed, Tenure(200, 14).Outcome);
    }

    // ── Join date and New badge ──────────────────────────────────────────

    [Theory]
    [InlineData(0, true)]
    [InlineData(29, true)]
    [InlineData(30, false)]
    public void NewBadgeShowsBelowTheConfiguredDays(int days, bool isNew)
    {
        Assert.Equal(isNew, Tenure(days, 0).IsNew);
    }

    [Fact]
    public void MissingJoinDateFallsBackToTheAccountCreationDateInIst()
    {
        // 1 Oct 2026 20:00 UTC is 2 Oct 01:30 IST: 32 days before 3 Nov.
        var status = Rules.EvaluateTenure(Config(), null, null, new DateTime(2026, 10, 1, 20, 0, 0, DateTimeKind.Utc), 0, false, Now);
        Assert.True(status.JoinDateFromAccount);
        Assert.Equal(new DateTime(2026, 10, 2), status.JoinDate);
        Assert.Equal(32, status.DaysSinceJoining);
        Assert.Equal("30–59 days", status.Band);
    }

    [Fact]
    public void JoiningDateSavedAsUtcFromTheFormIsReadAsTheIstDate()
    {
        // 29 Oct 18:30 UTC = 30 Oct 00:00 IST: 4 days before 3 Nov (not 5).
        var status = Rules.EvaluateTenure(Config(), null, new DateTime(2026, 10, 29, 18, 30, 0), null, 0, false, Now);
        Assert.Equal(new DateTime(2026, 10, 30), status.JoinDate);
        Assert.Equal(4, status.DaysSinceJoining);
    }

    [Fact]
    public void JoiningDateWithoutATimeIsUsedAsIs()
    {
        var status = Rules.EvaluateTenure(Config(), null, new DateTime(2026, 10, 30), null, 0, false, Now);
        Assert.Equal(new DateTime(2026, 10, 30), status.JoinDate);
        Assert.Equal(4, status.DaysSinceJoining);
    }

    [Fact]
    public void NoJoinDateAtAllBlocksWithoutAssumingABand()
    {
        foreach (var superAdmin in new[] { false, true })
        {
            var status = Rules.EvaluateTenure(Config(), null, null, default(DateTime), 0, superAdmin, Now);
            Assert.Equal(Rules.Outcome.Blocked, status.Outcome);
            Assert.Equal(Rules.JoinDateMissingMessage, status.Message);
            Assert.Null(status.Band);
            Assert.Null(status.Limit);
            Assert.Null(status.JoinDate);
        }
    }

    [Fact]
    public void FutureJoinDateCountsAsDayZero()
    {
        var status = Tenure(-5, 0);
        Assert.Equal(0, status.DaysSinceJoining);
        Assert.Equal("Under 15 days", status.Band);
    }

    // ── Combined with the other rules ────────────────────────────────────

    [Fact]
    public void TenureAboveStandardJoinsTheSuperAdminRequest()
    {
        var alone = Rules.Combine(NoOtherRule, Tenure(100, 16));
        Assert.Equal(Rules.Outcome.NeedsSuperAdmin, alone.Outcome);
        Assert.Equal("TenureOverLimit", alone.RuleCodesText);

        var grade = new Rules.Decision(Rules.Outcome.NeedsSuperAdmin, "x", null, false, new[] { Rules.GradeMismatchCode });
        var both = Rules.Combine(grade, Tenure(100, 16));
        Assert.Equal("GradeMismatch,TenureOverLimit", both.RuleCodesText);
        Assert.Contains("eligible grades", both.Message);
        Assert.Contains("above the standard active-student limit", both.Message);
    }

    [Fact]
    public void AnyBlockWins()
    {
        var cooldown = new Rules.Decision(Rules.Outcome.Blocked, "cooldown", Now.AddDays(3), false, Array.Empty<string>());
        Assert.Same(cooldown, Rules.Combine(cooldown, Tenure(100, 16)));

        var grade = new Rules.Decision(Rules.Outcome.NeedsSuperAdmin, "x", null, false, new[] { Rules.GradeMismatchCode });
        var capped = Rules.Combine(grade, Tenure(100, 20));
        Assert.Equal(Rules.Outcome.Blocked, capped.Outcome);
        Assert.Empty(capped.RuleCodes);
    }

    [Fact]
    public void WithinTheLimitTheOtherRulesDecideAlone()
    {
        var grade = new Rules.Decision(Rules.Outcome.NeedsSuperAdmin, "x", null, false, new[] { Rules.GradeMismatchCode });
        Assert.Same(grade, Rules.Combine(grade, Tenure(100, 3)));
        Assert.Same(NoOtherRule, Rules.Combine(NoOtherRule, Tenure(100, 16, superAdmin: true)));
    }

    // ── Routing after the Super Admin approves ───────────────────────────

    [Theory]
    [InlineData(TutorPaymentRequestType.AssignmentRuleApproval, "TenureOverLimit", Rules.StatusAfterApproval.MoveToApproved)]
    [InlineData(TutorPaymentRequestType.AssignmentWithPaymentChange, "TenureOverLimit", Rules.StatusAfterApproval.MoveToApproved)]
    [InlineData(TutorPaymentRequestType.AssignmentRuleApproval, "GradeMismatch,TenureOverLimit", Rules.StatusAfterApproval.KeepCurrent)]
    [InlineData(TutorPaymentRequestType.AssignmentRuleApproval, "Frequency,TenureOverLimit", Rules.StatusAfterApproval.KeepCurrent)]
    [InlineData(TutorPaymentRequestType.AssignmentWithPaymentChange, "GradeMismatch,TenureOverLimit", Rules.StatusAfterApproval.KeepCurrent)]
    [InlineData(TutorPaymentRequestType.AssignmentRuleApproval, "GradeMismatch", Rules.StatusAfterApproval.KeepCurrent)]
    [InlineData(TutorPaymentRequestType.AssignmentRuleApproval, "Frequency", Rules.StatusAfterApproval.KeepCurrent)]
    public void TenureAloneIsApprovedByTheSuperAdminOtherwiseTheCoordinatorAdminStillDecides(TutorPaymentRequestType type, string codes,
        Rules.StatusAfterApproval expected)
    {
        Assert.Equal(expected, Rules.StatusAfterSuperAdminApproval((int)type, codes));
    }
}
