using TCT.LMS.Application.Services;
using TCT.LMS.Domain;
using TCT.LMS.Domain.Entities;
using Rules = TCT.LMS.Application.Services.TutorAssignmentThresholdRules;

namespace TCT.Assessment.Tests;

public class TutorAssignmentThresholdRulesTests
{
    private static readonly DateTime Now = new(2026, 11, 3, 10, 0, 0, DateTimeKind.Utc);
    private static readonly Rules.Config Config = new(5, 10, 7, 14, 30, 24);

    private static Rules.Facts Coordinator(int students = 0, DateTime? lastUse = null, DateTime? holdStart = null, bool hasGrade = true) =>
        new(AppliesCoordinatorRules: true, AppliesGradeRule: true, students, lastUse, holdStart, hasGrade);

    private static Rules.Decision Evaluate(Rules.Facts facts) => Rules.Evaluate(facts, Config, null, Now);

    private static Dictionary<string, IReadOnlyList<decimal?>> ValidRows() => new()
    {
        [Rules.LowLoadStudentLimitName] = new decimal?[] { 5 },
        [Rules.HighLoadStudentLimitName] = new decimal?[] { 10 },
        [Rules.CooldownDaysLowName] = new decimal?[] { 7 },
        [Rules.CooldownDaysMidName] = new decimal?[] { 14 },
        [Rules.CooldownDaysHighName] = new decimal?[] { 30 },
        [Rules.DemoHoldHoursName] = new decimal?[] { 24 },
    };

    // ── Configuration ────────────────────────────────────────────────────

    [Fact]
    public void ValidConfigurationIsRead()
    {
        var config = Rules.ReadConfig(ValidRows(), out var error);
        Assert.Null(error);
        Assert.Equal(Config, config);
    }

    [Theory]
    [InlineData("missing")]
    [InlineData("duplicate")]
    [InlineData("null")]
    [InlineData("zero")]
    [InlineData("fraction")]
    [InlineData("lowAboveHigh")]
    public void InvalidConfigurationIsReported(string problem)
    {
        var rows = ValidRows();
        switch (problem)
        {
            case "missing": rows.Remove(Rules.DemoHoldHoursName); break;
            case "duplicate": rows[Rules.CooldownDaysLowName] = new decimal?[] { 7, 8 }; break;
            case "null": rows[Rules.CooldownDaysMidName] = new decimal?[] { null }; break;
            case "zero": rows[Rules.CooldownDaysHighName] = new decimal?[] { 0 }; break;
            case "fraction": rows[Rules.DemoHoldHoursName] = new decimal?[] { 24.5m }; break;
            case "lowAboveHigh": rows[Rules.LowLoadStudentLimitName] = new decimal?[] { 11 }; break;
        }
        Assert.Null(Rules.ReadConfig(rows, out var error));
        Assert.False(string.IsNullOrWhiteSpace(error));
    }

    [Fact]
    public void MissingConfigurationBlocksCoordinatorInsteadOfSkippingTheRules()
    {
        var decision = Rules.Evaluate(Coordinator(), null, "TutorDemoHoldHours is missing or inactive", Now);
        Assert.Equal(Rules.Outcome.Blocked, decision.Outcome);
        Assert.Contains("TutorDemoHoldHours", decision.Message);
    }

    [Fact]
    public void MissingConfigurationDoesNotAffectUsersOutsideTheCoordinatorRules()
    {
        var superAdmin = new Rules.Facts(false, false, 3, Now.AddDays(-1), Now.AddHours(-1), false);
        Assert.Equal(Rules.Outcome.Allowed, Rules.Evaluate(superAdmin, null, "missing", Now).Outcome);
    }

    // ── Rules 1-3: cooldown by active students ───────────────────────────

    [Theory]
    [InlineData(0, 7)]
    [InlineData(4, 7)]    // fewer than 5
    [InlineData(5, 14)]   // 5-10
    [InlineData(10, 14)]
    [InlineData(11, 30)]  // more than 10
    public void CooldownFollowsTheTutorsCurrentActiveStudents(int students, int days)
    {
        Assert.Equal(days, Rules.CooldownDays(Config, students));
    }

    [Theory]
    [InlineData(4, 7)]
    [InlineData(5, 14)]
    [InlineData(10, 14)]
    public void RepeatWithinCooldownIsBlockedUntilItEnds(int students, int days)
    {
        var lastUse = Now.AddDays(-days).AddMinutes(1);
        var decision = Evaluate(Coordinator(students, lastUse));
        Assert.Equal(Rules.Outcome.Blocked, decision.Outcome);
        Assert.Equal(lastUse.AddDays(days), decision.BlockedUntilUtc);
        Assert.False(decision.HeldForOtherCoordinator);
    }

    [Theory]
    [InlineData(4, 7)]
    [InlineData(10, 14)]
    [InlineData(11, 30)]
    public void AssignIsEnabledAgainOnceTheCooldownHasPassed(int students, int days)
    {
        Assert.Equal(Rules.Outcome.Allowed, Evaluate(Coordinator(students, Now.AddDays(-days))).Outcome);
    }

    [Fact]
    public void HighLoadRepeatWithinThirtyDaysGoesToSuperAdminInsteadOfBlocking()
    {
        var decision = Evaluate(Coordinator(11, Now.AddDays(-29)));
        Assert.Equal(Rules.Outcome.NeedsSuperAdmin, decision.Outcome);
        Assert.Equal(new[] { Rules.FrequencyCode }, decision.RuleCodes);
        Assert.Null(decision.BlockedUntilUtc);
    }

    [Fact]
    public void FirstAssignmentByACoordinatorIsAllowed()
    {
        Assert.Equal(Rules.Outcome.Allowed, Evaluate(Coordinator(3, lastUse: null)).Outcome);
    }

    // ── Rule 4: pending demo hold ────────────────────────────────────────

    [Fact]
    public void TutorHeldForAnotherCoordinatorsPendingDemoIsBlockedFor24Hours()
    {
        var holdStart = Now.AddHours(-23);
        var decision = Evaluate(Coordinator(holdStart: holdStart));
        Assert.Equal(Rules.Outcome.Blocked, decision.Outcome);
        Assert.True(decision.HeldForOtherCoordinator);
        Assert.Equal(holdStart.AddHours(24), decision.BlockedUntilUtc);
    }

    [Fact]
    public void HoldIsReleasedAfter24Hours()
    {
        Assert.Equal(Rules.Outcome.Allowed, Evaluate(Coordinator(holdStart: Now.AddHours(-24))).Outcome);
    }

    [Fact]
    public void HoldWinsOverTheCooldownAndGradeRules()
    {
        var decision = Evaluate(Coordinator(11, Now.AddDays(-1), Now.AddHours(-1), hasGrade: false));
        Assert.Equal(Rules.Outcome.Blocked, decision.Outcome);
        Assert.True(decision.HeldForOtherCoordinator);
    }

    [Fact]
    public void PendingDemoStatusesAreTheDemoPendingScreensStatusesWithATutor()
    {
        Assert.Equal(
            new[] { (int)FollowUpStatus.DemoPendingTutorAssigned, (int)FollowUpStatus.DemoPendingTutorAssignedNotApproved,
                    (int)FollowUpStatus.DemoPendingTutorAssignedApproved },
            Rules.PendingDemoStatusCodes);
        Assert.DoesNotContain((int)FollowUpStatus.DemoCompleted, Rules.PendingDemoStatusCodes);
        Assert.DoesNotContain((int)FollowUpStatus.DemoCancelled, Rules.PendingDemoStatusCodes);
    }

    // ── Rule 5: grade ────────────────────────────────────────────────────

    [Fact]
    public void GradeOutsideTheTutorsEligibleGradesNeedsSuperAdmin()
    {
        var decision = Evaluate(Coordinator(hasGrade: false));
        Assert.Equal(Rules.Outcome.NeedsSuperAdmin, decision.Outcome);
        Assert.Equal(Rules.GradeMismatchCode, decision.RuleCodesText);
    }

    [Fact]
    public void GradeRuleAppliesToNonCoordinatorsExceptSuperAdmin()
    {
        var coordinatorAdmin = new Rules.Facts(false, true, 0, null, null, false);
        Assert.Equal(Rules.Outcome.NeedsSuperAdmin, Rules.Evaluate(coordinatorAdmin, null, "missing", Now).Outcome);
        var superAdmin = new Rules.Facts(false, false, 0, null, null, false);
        Assert.Equal(Rules.Outcome.Allowed, Rules.Evaluate(superAdmin, Config, null, Now).Outcome);
    }

    [Fact]
    public void FrequencyAndGradeReasonsAreCombinedInOneRequest()
    {
        var decision = Evaluate(Coordinator(12, Now.AddDays(-2), hasGrade: false));
        Assert.Equal(Rules.Outcome.NeedsSuperAdmin, decision.Outcome);
        Assert.Equal("Frequency,GradeMismatch", decision.RuleCodesText);
        Assert.Contains("cooldown", Rules.Describe(decision.RuleCodesText));
        Assert.Contains("grade", Rules.Describe(decision.RuleCodesText));
    }

    // ── Super Admin request handling ─────────────────────────────────────

    [Fact]
    public void PendingRuleRequestIsFoundOnlyForTheSameAttempt()
    {
        var course = Guid.NewGuid(); var tutor = Guid.NewGuid(); var coordinator = Guid.NewGuid();
        var match = Rules.IsPendingRuleRequest(course, tutor, coordinator).Compile();
        TutorPaymentApproval Request(Action<TutorPaymentApproval>? change = null)
        {
            var r = new TutorPaymentApproval
            {
                SalesDetailsId = course, TutorId = tutor, RequestedBy = coordinator, IsActive = true,
                ApprovalStatus = (int)TutorPaymentStatus.Pending, AssignmentRuleCodes = Rules.GradeMismatchCode
            };
            change?.Invoke(r);
            return r;
        }

        Assert.True(match(Request()));
        Assert.False(match(Request(r => r.AssignmentRuleCodes = null)));          // ordinary payment request
        Assert.False(match(Request(r => r.ApprovalStatus = (int)TutorPaymentStatus.Approved)));
        Assert.False(match(Request(r => r.IsActive = false)));
        Assert.False(match(Request(r => r.RequestedBy = Guid.NewGuid())));        // another coordinator
        Assert.False(match(Request(r => r.TutorId = Guid.NewGuid())));
    }

    [Fact]
    public void RuleOnlyApprovalKeepsTheAssignmentAndRejectionRollsItBack()
    {
        Assert.True(Rules.KeepsAssignmentOnApproval((int)TutorPaymentRequestType.AssignmentRuleApproval));
        Assert.False(Rules.KeepsAssignmentOnApproval((int)TutorPaymentRequestType.AssignmentWithPaymentChange));
        Assert.True(Rules.DeactivatesAllocationOnRejection((int)TutorPaymentRequestType.AssignmentRuleApproval));
        Assert.True(Rules.DeactivatesAllocationOnRejection((int)TutorPaymentRequestType.AssignmentWithPaymentChange));
        Assert.False(Rules.DeactivatesAllocationOnRejection((int)TutorPaymentRequestType.ExistingAssignmentPaymentChange));
        Assert.False(Rules.DeactivatesAllocationOnRejection((int)TutorPaymentRequestType.TutorRateChange));
    }

    // ── Audit fixes: S3, E2, E3 ──────────────────────────────────────────

    [Theory]
    [InlineData(true, true, true)]     // same tutor with an active allocation: re-save, rules not re-checked
    [InlineData(true, false, false)]   // tutor id stored on the course without an allocation (e.g. sent at enrolment)
    [InlineData(false, false, false)]  // another tutor
    [InlineData(false, true, false)]
    public void OnlyAnAllocatedSameTutorCountsAsAnExistingAssignment(bool sameTutor, bool hasAllocation, bool existing)
    {
        Assert.Equal(existing, Rules.IsExistingAssignment(sameTutor, hasAllocation));
    }

    [Theory]
    [InlineData(TutorPaymentRequestType.AssignmentWithPaymentChange, Rules.StatusAfterApproval.MoveToApproved)]
    [InlineData(TutorPaymentRequestType.ExistingAssignmentPaymentChange, Rules.StatusAfterApproval.RestorePrevious)]
    [InlineData(TutorPaymentRequestType.AssignmentOnly, Rules.StatusAfterApproval.RestorePrevious)]
    [InlineData(TutorPaymentRequestType.TutorRateChange, Rules.StatusAfterApproval.RestorePrevious)]
    public void OrdinaryPaymentRequestsKeepTheirApprovalBehaviour(TutorPaymentRequestType type, Rules.StatusAfterApproval expected)
    {
        Assert.Equal(expected, Rules.StatusAfterSuperAdminApproval((int)type, null));
    }

    [Theory]
    [InlineData(TutorPaymentRequestType.AssignmentWithPaymentChange, Rules.FrequencyCode)]
    [InlineData(TutorPaymentRequestType.AssignmentWithPaymentChange, "Frequency,GradeMismatch")]
    [InlineData(TutorPaymentRequestType.ExistingAssignmentPaymentChange, Rules.GradeMismatchCode)]
    public void CombinedRuleAndPaymentRequestKeepsItsStatusForTheCoordinatorAdmin(TutorPaymentRequestType type, string codes)
    {
        Assert.Equal(Rules.StatusAfterApproval.KeepCurrent, Rules.StatusAfterSuperAdminApproval((int)type, codes));
    }

    [Fact]
    public void RuleOnlyDecisionMessageReportsTheAssignmentNotAPayment()
    {
        var approved = Rules.AssignmentDecisionMessage("Asha", true, "Fine");
        Assert.Equal("Tutor assignment for <b>Asha</b> was <b>approved</b>. Comment: Fine.", approved);
        var rejected = Rules.AssignmentDecisionMessage(null, false, "Grade too low");
        Assert.Contains("<b>Tutor</b> was <b>rejected</b>", rejected);
        Assert.DoesNotContain("amount", rejected, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void RuleRequestStillBlocksTheCoordinatorAdminDecisionUntilTheSuperAdminDecides()
    {
        // The existing gate matches any pending request for the course and tutor, rule requests included.
        var course = Guid.NewGuid(); var tutor = Guid.NewGuid();
        var pending = TutorPaymentApprovalRules.IsPendingSuperAdminRequest(course, tutor).Compile();
        Assert.True(pending(new TutorPaymentApproval
        {
            SalesDetailsId = course, TutorId = tutor, IsActive = true, ApprovalStatus = (int)TutorPaymentStatus.Pending,
            RequestType = (int)TutorPaymentRequestType.AssignmentRuleApproval, AssignmentRuleCodes = Rules.FrequencyCode
        }));
        Assert.True(TutorPaymentApprovalRules.BlocksCoordinatorAdminDecision((int)FollowUpStatus.DemoPendingTutorAssignedApproved, true));
    }
}
