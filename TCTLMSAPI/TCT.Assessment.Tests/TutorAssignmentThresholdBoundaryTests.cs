using Rules = TCT.LMS.Application.Services.TutorAssignmentThresholdRules;

namespace TCT.Assessment.Tests;

/// <summary>
/// Boundary checks for the tutor assignment thresholds with the values the DDL scripts configure
/// (TutorAssignmentThresholds.sql, TutorAssignmentTenureThresholds.sql): below, at and above each limit,
/// the exact moment a cooldown or demo hold ends, and the fail-safe outcome of invalid configuration.
/// </summary>
public class TutorAssignmentThresholdBoundaryTests
{
    // 10:00 UTC = 15:30 IST on 3 Nov 2026.
    private static readonly DateTime Now = new(2026, 11, 3, 10, 0, 0, DateTimeKind.Utc);
    private static readonly DateTime Today = new(2026, 11, 3);
    private static readonly TimeSpan Second = TimeSpan.FromSeconds(1);

    private static Dictionary<string, IReadOnlyList<decimal?>> AssignmentRows() => new()
    {
        [Rules.LowLoadStudentLimitName] = new decimal?[] { 5 },
        [Rules.HighLoadStudentLimitName] = new decimal?[] { 10 },
        [Rules.CooldownDaysLowName] = new decimal?[] { 7 },
        [Rules.CooldownDaysMidName] = new decimal?[] { 14 },
        [Rules.CooldownDaysHighName] = new decimal?[] { 30 },
        [Rules.DemoHoldHoursName] = new decimal?[] { 24 },
    };

    private static Dictionary<string, IReadOnlyList<decimal?>> TenureRows() => new()
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

    private static Rules.Config AssignmentConfig() => Rules.ReadConfig(AssignmentRows(), out _)!;
    private static Rules.TenureConfig TenureConfig() => Rules.ReadTenureConfig(TenureRows(), out _)!;

    private static Rules.Decision Coordinator(int students, DateTime? lastUse = null, DateTime? holdStart = null, bool hasGrade = true) =>
        Rules.Evaluate(new Rules.Facts(true, true, students, lastUse, holdStart, hasGrade), AssignmentConfig(), null, Now);

    private static Rules.TenureStatus Tenure(int daysSinceJoining, int activeStudents, bool superAdmin = false) =>
        Rules.EvaluateTenure(TenureConfig(), null, Today.AddDays(-daysSinceJoining), null, activeStudents, superAdmin, Now);

    private static Rules.Decision Decided(Rules.Outcome outcome, params string[] codes) =>
        new(outcome, outcome == Rules.Outcome.Blocked ? "other rule" : null, null, false, codes);

    [Fact]
    public void ScriptValuesAreReadAsConfigured()
    {
        Assert.Equal(new Rules.Config(5, 10, 7, 14, 30, 24), AssignmentConfig());
        var tenure = TenureConfig();
        Assert.Equal(new[] { (15, 1), (30, 3), (60, 6), (90, 10) }, tenure.Bands.Select(b => (b.Days, b.MaxStudents)));
        Assert.Equal((15, 20), (tenure.StandardMaxStudents, tenure.SuperAdminMaxStudents));
    }

    // ── Coordinator cooldown: blocked until the exact end, then allowed ──

    [Theory]
    [InlineData(0, 7, Rules.Outcome.Blocked)]
    [InlineData(4, 7, Rules.Outcome.Blocked)]           // below the low-load limit (5)
    [InlineData(5, 14, Rules.Outcome.Blocked)]          // at the low-load limit
    [InlineData(10, 14, Rules.Outcome.Blocked)]         // at the high-load limit (10)
    [InlineData(11, 30, Rules.Outcome.NeedsSuperAdmin)] // above it: repeat goes to the Super Admin
    public void CooldownHoldsUntilItsLastSecondAndEndsExactlyOnTime(int students, int days, Rules.Outcome inside)
    {
        var lastSecond = Coordinator(students, lastUse: Now - TimeSpan.FromDays(days) + Second);
        Assert.Equal(inside, lastSecond.Outcome);
        if (inside == Rules.Outcome.Blocked) Assert.Equal(Now + Second, lastSecond.BlockedUntilUtc);
        else Assert.Equal(new[] { Rules.FrequencyCode }, lastSecond.RuleCodes);

        Assert.Equal(Rules.Outcome.Allowed, Coordinator(students, lastUse: Now - TimeSpan.FromDays(days)).Outcome);
        Assert.Equal(Rules.Outcome.Allowed, Coordinator(students, lastUse: Now - TimeSpan.FromDays(days) - Second).Outcome);
    }

    [Fact]
    public void DemoHoldEndsExactlyAfterTheConfiguredHours()
    {
        var held = Coordinator(0, holdStart: Now - TimeSpan.FromHours(24) + Second);
        Assert.Equal(Rules.Outcome.Blocked, held.Outcome);
        Assert.True(held.HeldForOtherCoordinator);
        Assert.Equal(Now + Second, held.BlockedUntilUtc);

        Assert.Equal(Rules.Outcome.Allowed, Coordinator(0, holdStart: Now - TimeSpan.FromHours(24)).Outcome);
        Assert.Equal(Rules.Outcome.Allowed, Coordinator(0, holdStart: Now - TimeSpan.FromHours(25)).Outcome);
    }

    [Fact]
    public void HighLoadRepeatWithAGradeMismatchIsOneSuperAdminRequestWithBothReasons()
    {
        var decision = Coordinator(11, lastUse: Now - TimeSpan.FromDays(1), hasGrade: false);
        Assert.Equal(Rules.Outcome.NeedsSuperAdmin, decision.Outcome);
        Assert.Equal("Frequency,GradeMismatch", decision.RuleCodesText);
    }

    [Theory]
    [InlineData(true)]   // Coordinator Admin / Operations: grade rule only
    [InlineData(false)]  // Super Admin: neither
    public void CooldownAndHoldApplyOnlyToCoordinators(bool appliesGradeRule)
    {
        var facts = new Rules.Facts(false, appliesGradeRule, 11, Now - TimeSpan.FromDays(1), Now - TimeSpan.FromHours(1), true);
        Assert.Equal(Rules.Outcome.Allowed, Rules.Evaluate(facts, AssignmentConfig(), null, Now).Outcome);
    }

    // ── Assignment rule configuration: fail safe ─────────────────────────

    [Theory]
    [InlineData(-1)]
    [InlineData(2147483648)]  // int.MaxValue + 1
    public void OutOfRangeAssignmentValuesAreRejected(double value)
    {
        var rows = AssignmentRows();
        rows[Rules.CooldownDaysMidName] = new decimal?[] { (decimal)value };
        Assert.Null(Rules.ReadConfig(rows, out var error));
        Assert.Equal($"{Rules.CooldownDaysMidName} must be a positive whole number", error);
    }

    [Fact]
    public void EqualLowAndHighLoadLimitsAreValid()
    {
        var rows = AssignmentRows();
        rows[Rules.HighLoadStudentLimitName] = new decimal?[] { 5 };
        Assert.NotNull(Rules.ReadConfig(rows, out var error));
        Assert.Null(error);
    }

    [Fact]
    public void NoAssignmentRowsReportsEveryNameAndBlocksOnlyCoordinators()
    {
        Assert.Null(Rules.ReadConfig(new Dictionary<string, IReadOnlyList<decimal?>>(), out var error));
        foreach (var name in Rules.ThresholdNames) Assert.Contains($"{name} is missing or inactive", error);

        var coordinator = Rules.Evaluate(new Rules.Facts(true, true, 0, null, null, true), null, error, Now);
        Assert.Equal(Rules.Outcome.Blocked, coordinator.Outcome);
        Assert.Contains("not configured correctly", coordinator.Message);

        // Other roles: the grade rule still applies without the configuration.
        var gradeMismatch = Rules.Evaluate(new Rules.Facts(false, true, 0, null, null, false), null, error, Now);
        Assert.Equal(Rules.Outcome.NeedsSuperAdmin, gradeMismatch.Outcome);
        Assert.Equal(Rules.GradeMismatchCode, gradeMismatch.RuleCodesText);
    }

    // ── Tenure bands: below, at and above each limit, on the band's first and last day ──

    [Theory]
    [InlineData(0, 1)]
    [InlineData(14, 1)]
    [InlineData(15, 3)]
    [InlineData(29, 3)]
    [InlineData(30, 6)]
    [InlineData(59, 6)]
    [InlineData(60, 10)]
    [InlineData(89, 10)]
    public void EachBandAllowsBelowItsLimitAndBlocksAtAndAboveItForEveryRole(int days, int limit)
    {
        foreach (var superAdmin in new[] { false, true })
        {
            Assert.Equal(Rules.Outcome.Allowed, Tenure(days, limit - 1, superAdmin).Outcome);
            Assert.Equal(Rules.Outcome.Blocked, Tenure(days, limit, superAdmin).Outcome);
            Assert.Equal(Rules.Outcome.Blocked, Tenure(days, limit + 1, superAdmin).Outcome);
            Assert.Equal(limit, Tenure(days, limit, superAdmin).Limit);
        }
    }

    [Theory]
    [InlineData(14, 1)]
    [InlineData(29, 3)]
    [InlineData(59, 6)]
    [InlineData(89, 10)]
    public void TheNextDayMovesTheTutorIntoTheNextBand(int lastDayOfBand, int studentsAtItsLimit)
    {
        Assert.Equal(Rules.Outcome.Blocked, Tenure(lastDayOfBand, studentsAtItsLimit).Outcome);
        Assert.Equal(Rules.Outcome.Allowed, Tenure(lastDayOfBand + 1, studentsAtItsLimit).Outcome);
    }

    [Theory]
    [InlineData(14, Rules.Outcome.Allowed, Rules.Outcome.Allowed)]
    [InlineData(15, Rules.Outcome.NeedsSuperAdmin, Rules.Outcome.Allowed)]   // at the standard limit
    [InlineData(16, Rules.Outcome.NeedsSuperAdmin, Rules.Outcome.Allowed)]
    [InlineData(19, Rules.Outcome.NeedsSuperAdmin, Rules.Outcome.Allowed)]   // the 20th student
    [InlineData(20, Rules.Outcome.Blocked, Rules.Outcome.Blocked)]           // at the cap
    [InlineData(21, Rules.Outcome.Blocked, Rules.Outcome.Blocked)]
    public void NinetyPlusDaysStandardLimitAndCap(int activeStudents, Rules.Outcome otherRoles, Rules.Outcome superAdmin)
    {
        foreach (var days in new[] { 90, 400 })
        {
            Assert.Equal(otherRoles, Tenure(days, activeStudents).Outcome);
            Assert.Equal(superAdmin, Tenure(days, activeStudents, superAdmin: true).Outcome);
        }
    }

    // ── Tenure configuration: fail safe for every role ─────────────────────

    [Theory]
    [InlineData(-5)]
    [InlineData(2147483648)]
    public void OutOfRangeTenureValuesAreRejected(double value)
    {
        var rows = TenureRows();
        rows[Rules.TenureSuperAdminMaxStudentsName] = new decimal?[] { (decimal)value };
        Assert.Null(Rules.ReadTenureConfig(rows, out var error));
        Assert.Contains($"{Rules.TenureSuperAdminMaxStudentsName} must be a positive whole number", error);
    }

    [Fact]
    public void NullTenureValueIsRejected()
    {
        var rows = TenureRows();
        rows[Rules.TenureBand4MaxStudentsName] = new decimal?[] { null };
        Assert.Null(Rules.ReadTenureConfig(rows, out var error));
        Assert.Equal($"{Rules.TenureBand4MaxStudentsName} must be a positive whole number", error);
    }

    [Fact]
    public void AnInactiveTenureRowBlocksEveryRoleWithTheReason()
    {
        var rows = TenureRows();
        rows.Remove(Rules.TenureStandardMaxStudentsName);   // only active rows are loaded
        var config = Rules.ReadTenureConfig(rows, out var error);
        Assert.Null(config);

        foreach (var superAdmin in new[] { false, true })
        {
            var status = Rules.EvaluateTenure(config, error, Today.AddDays(-400), null, 0, superAdmin, Now);
            Assert.Equal(Rules.Outcome.Blocked, status.Outcome);
            Assert.Contains($"{Rules.TenureStandardMaxStudentsName} is missing or inactive", status.Message);
        }
    }

    // ── Both rule sets together ──────────────────────────────────────────

    [Fact]
    public void AnAssignmentRuleBlockWinsOverATenureApproval()
    {
        var combined = Rules.Combine(Decided(Rules.Outcome.Blocked), Tenure(400, 15));
        Assert.Equal(Rules.Outcome.Blocked, combined.Outcome);
        Assert.Equal("other rule", combined.Message);
    }

    [Fact]
    public void ATenureBlockWinsOverAnAssignmentRuleApproval()
    {
        var combined = Rules.Combine(Decided(Rules.Outcome.NeedsSuperAdmin, Rules.GradeMismatchCode), Tenure(10, 1));
        Assert.Equal(Rules.Outcome.Blocked, combined.Outcome);
        Assert.Contains("Under 15 days", combined.Message);
        Assert.Empty(combined.RuleCodes);
    }

    [Fact]
    public void TwoApprovalsBecomeOneSuperAdminRequest()
    {
        var combined = Rules.Combine(Decided(Rules.Outcome.NeedsSuperAdmin, Rules.GradeMismatchCode), Tenure(400, 15));
        Assert.Equal(Rules.Outcome.NeedsSuperAdmin, combined.Outcome);
        Assert.Equal("GradeMismatch,TenureOverLimit", combined.RuleCodesText);
        Assert.False(Rules.IsSuperAdminOnlyRule(combined.RuleCodesText));
    }

    [Fact]
    public void BothConfigurationsMissingBlocksACoordinator()
    {
        Rules.ReadConfig(new Dictionary<string, IReadOnlyList<decimal?>>(), out var assignmentError);
        Rules.ReadTenureConfig(new Dictionary<string, IReadOnlyList<decimal?>>(), out var tenureError);
        var decision = Rules.Evaluate(new Rules.Facts(true, true, 0, null, null, true), null, assignmentError, Now);
        var tenure = Rules.EvaluateTenure(null, tenureError, Today.AddDays(-400), null, 0, false, Now);

        var combined = Rules.Combine(decision, tenure);
        Assert.Equal(Rules.Outcome.Blocked, combined.Outcome);
        Assert.Contains("Tutor assignment rules are not configured correctly", combined.Message);
    }
}
