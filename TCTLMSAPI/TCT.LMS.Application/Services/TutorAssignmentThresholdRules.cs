using System.Globalization;
using System.Linq.Expressions;
using Common;
using TCT.LMS.Domain;
using TCT.LMS.Domain.Entities;

namespace TCT.LMS.Application.Services;

/// <summary>
/// Tutor assignment thresholds (Threshold Configuration, group "TutorAssignment"), checked when a tutor is assigned
/// (SalesRepository.UpdateSalesDetailsStatus) and when the assignment tutor lists are loaded:
///   1-3. a Coordinator may assign the same tutor once per cooldown (7 / 14 / 30 days by the tutor's active students);
///        within the cooldown the assignment is blocked, or for a tutor above the high-load limit sent to the Super Admin;
///   4.   while another coordinator's demo assignment for the same board, grade and subject is pending, the tutor is
///        held for that coordinator for the configured hours;
///   5.   a student grade that is not among the tutor's eligible grades (active TutorDetails) needs Super Admin approval;
///   6.   tenure limits (group "TutorAssignTenure", every role): active students by days since joining; a 90+ day tutor
///        above the standard limit needs the Super Admin (who may assign directly) and the cap blocks everyone.
/// Missing or invalid configuration blocks the coordinator rules instead of skipping them; for the tenure limits (and
/// a missing join date) it blocks every assignment.
/// </summary>
public static class TutorAssignmentThresholdRules
{
    public const string LowLoadStudentLimitName = "TutorAssignLowLoadStudentLimit";
    public const string HighLoadStudentLimitName = "TutorAssignHighLoadStudentLimit";
    public const string CooldownDaysLowName = "TutorAssignCooldownDaysLow";
    public const string CooldownDaysMidName = "TutorAssignCooldownDaysMid";
    public const string CooldownDaysHighName = "TutorAssignCooldownDaysHigh";
    public const string DemoHoldHoursName = "TutorDemoHoldHours";

    public static readonly string[] ThresholdNames =
    {
        LowLoadStudentLimitName, HighLoadStudentLimitName, CooldownDaysLowName,
        CooldownDaysMidName, CooldownDaysHighName, DemoHoldHoursName
    };

    // Tenure limits (group "TutorAssignTenure"): maximum active students by days since the tutor joined. Four bands
    // ("fewer than N days: at most M"), then the standard limit; above it a Super Admin may approve up to the cap.
    public const string TenureBand1DaysName = "TutorTenureBand1Days";
    public const string TenureBand1MaxStudentsName = "TutorTenureBand1MaxStudents";
    public const string TenureBand2DaysName = "TutorTenureBand2Days";
    public const string TenureBand2MaxStudentsName = "TutorTenureBand2MaxStudents";
    public const string TenureBand3DaysName = "TutorTenureBand3Days";
    public const string TenureBand3MaxStudentsName = "TutorTenureBand3MaxStudents";
    public const string TenureBand4DaysName = "TutorTenureBand4Days";
    public const string TenureBand4MaxStudentsName = "TutorTenureBand4MaxStudents";
    public const string TenureStandardMaxStudentsName = "TutorTenureStandardMaxStudents";
    public const string TenureSuperAdminMaxStudentsName = "TutorTenureSuperAdminMaxStudents";
    public const string TenureNewBadgeDaysName = "TutorTenureNewBadgeDays";

    public static readonly string[] TenureThresholdNames =
    {
        TenureBand1DaysName, TenureBand1MaxStudentsName, TenureBand2DaysName, TenureBand2MaxStudentsName,
        TenureBand3DaysName, TenureBand3MaxStudentsName, TenureBand4DaysName, TenureBand4MaxStudentsName,
        TenureStandardMaxStudentsName, TenureSuperAdminMaxStudentsName, TenureNewBadgeDaysName
    };

    // Codes stored in TutorPaymentApproval.AssignmentRuleCodes.
    public const string FrequencyCode = "Frequency";
    public const string GradeMismatchCode = "GradeMismatch";
    // A 90+ day tutor above the standard limit (below the cap): approved by the Super Admin alone.
    public const string TenureOverLimitCode = "TenureOverLimit";

    // A demo assignment is pending while the course is in one of the Demo Pending screen statuses that have a
    // tutor (ScheduleRepository.GetAsync: 20001, 20002, 20012, 20013; 20001 has no tutor).
    public static readonly int[] PendingDemoStatusCodes =
    {
        (int)FollowUpStatus.DemoPendingTutorAssigned,
        (int)FollowUpStatus.DemoPendingTutorAssignedNotApproved,
        (int)FollowUpStatus.DemoPendingTutorAssignedApproved
    };

    public sealed record Config(int LowLoadStudentLimit, int HighLoadStudentLimit,
        int CooldownDaysLow, int CooldownDaysMid, int CooldownDaysHigh, int DemoHoldHours);

    /// <param name="AppliesCoordinatorRules">Rules 1-4: the assigning user has the Coordinator role.</param>
    /// <param name="AppliesGradeRule">Rule 5: the assigning user is not a Super Admin.</param>
    /// <param name="ActiveStudentCount">Distinct students on the tutor's active allocations, this course excluded.</param>
    /// <param name="LastUseByCallerUtc">Latest allocation this user created for the tutor on another course.</param>
    /// <param name="OtherCoordinatorHoldStartUtc">Latest active allocation of the tutor created by another user whose course
    /// has the same board, grade and subject and is still a pending demo.</param>
    /// <param name="TutorHasStudentGrade">The tutor has an active skill row (TutorDetails) for the student's grade.</param>
    public sealed record Facts(bool AppliesCoordinatorRules, bool AppliesGradeRule, int ActiveStudentCount,
        DateTime? LastUseByCallerUtc, DateTime? OtherCoordinatorHoldStartUtc, bool TutorHasStudentGrade);

    public enum Outcome { Allowed, Blocked, NeedsSuperAdmin }

    public sealed record Decision(Outcome Outcome, string? Message, DateTime? BlockedUntilUtc,
        bool HeldForOtherCoordinator, IReadOnlyList<string> RuleCodes)
    {
        public string? RuleCodesText => RuleCodes.Count == 0 ? null : string.Join(",", RuleCodes);
    }

    private static readonly Decision Allowed = new(Outcome.Allowed, null, null, false, Array.Empty<string>());

    // Each name needs exactly one active row whose value is a positive whole number, and the low-load limit
    // cannot exceed the high-load limit. Null (with the reason) otherwise.
    public static Config? ReadConfig(IReadOnlyDictionary<string, IReadOnlyList<decimal?>> activeValuesByName, out string? error)
    {
        var values = new Dictionary<string, int>();
        var problems = new List<string>();
        foreach (var name in ThresholdNames)
        {
            var rows = activeValuesByName.TryGetValue(name, out var found) ? found : Array.Empty<decimal?>();
            if (rows.Count == 0) problems.Add($"{name} is missing or inactive");
            else if (rows.Count > 1) problems.Add($"{name} is configured more than once");
            else if (rows[0] is not { } value || value <= 0 || value != decimal.Truncate(value) || value > int.MaxValue)
                problems.Add($"{name} must be a positive whole number");
            else values[name] = (int)rows[0]!.Value;
        }
        if (problems.Count == 0 && values[LowLoadStudentLimitName] > values[HighLoadStudentLimitName])
            problems.Add($"{LowLoadStudentLimitName} cannot be greater than {HighLoadStudentLimitName}");
        if (problems.Count > 0)
        {
            error = string.Join("; ", problems);
            return null;
        }

        error = null;
        return new Config(values[LowLoadStudentLimitName], values[HighLoadStudentLimitName], values[CooldownDaysLowName],
            values[CooldownDaysMidName], values[CooldownDaysHighName], values[DemoHoldHoursName]);
    }

    // Fewer than the low-load limit, up to the high-load limit, or above it.
    public static bool IsHighLoad(Config config, int activeStudents) => activeStudents > config.HighLoadStudentLimit;

    public static int CooldownDays(Config config, int activeStudents) =>
        activeStudents < config.LowLoadStudentLimit ? config.CooldownDaysLow
        : activeStudents <= config.HighLoadStudentLimit ? config.CooldownDaysMid
        : config.CooldownDaysHigh;

    public static Decision Evaluate(Facts facts, Config? config, string? configError, DateTime nowUtc)
    {
        var codes = new List<string>();
        if (facts.AppliesCoordinatorRules)
        {
            if (config == null)
                return new Decision(Outcome.Blocked,
                    $"Tutor assignment rules are not configured correctly ({configError}). Please ask the Super Admin to check Threshold Configuration.",
                    null, false, Array.Empty<string>());

            if (facts.OtherCoordinatorHoldStartUtc is { } holdStart)
            {
                var holdEnd = holdStart.AddHours(config.DemoHoldHours);
                if (nowUtc < holdEnd)
                    return new Decision(Outcome.Blocked,
                        $"This tutor is reserved for another coordinator's pending demo for the same board, grade and subject until {FormatIst(holdEnd)}.",
                        holdEnd, true, Array.Empty<string>());
            }

            if (facts.LastUseByCallerUtc is { } lastUse)
            {
                var days = CooldownDays(config, facts.ActiveStudentCount);
                var cooldownEnd = lastUse.AddDays(days);
                if (nowUtc < cooldownEnd)
                {
                    if (IsHighLoad(config, facts.ActiveStudentCount)) codes.Add(FrequencyCode);
                    else
                        return new Decision(Outcome.Blocked,
                            $"You assigned this tutor within the last {days} days. You can assign this tutor again from {FormatIst(cooldownEnd)}.",
                            cooldownEnd, false, Array.Empty<string>());
                }
            }
        }

        if (facts.AppliesGradeRule && !facts.TutorHasStudentGrade) codes.Add(GradeMismatchCode);

        return codes.Count == 0
            ? Allowed
            : new Decision(Outcome.NeedsSuperAdmin,
                $"This assignment needs Super Admin approval: {Describe(codes)}.", null, false, codes);
    }

    public sealed record TenureBand(int Days, int MaxStudents);

    public sealed record TenureConfig(IReadOnlyList<TenureBand> Bands, int StandardMaxStudents, int SuperAdminMaxStudents,
        int NewBadgeDays);

    // Each name needs exactly one active row whose value is a positive whole number; band days must increase, limits
    // cannot decrease from band to band, the standard limit cannot be below the last band's and the Super Admin cap
    // cannot be below the standard limit. Null (with the reason) otherwise.
    public static TenureConfig? ReadTenureConfig(IReadOnlyDictionary<string, IReadOnlyList<decimal?>> activeValuesByName, out string? error)
    {
        var values = new Dictionary<string, int>();
        var problems = new List<string>();
        foreach (var name in TenureThresholdNames)
        {
            var rows = activeValuesByName.TryGetValue(name, out var found) ? found : Array.Empty<decimal?>();
            if (rows.Count == 0) problems.Add($"{name} is missing or inactive");
            else if (rows.Count > 1) problems.Add($"{name} is configured more than once");
            else if (rows[0] is not { } value || value <= 0 || value != decimal.Truncate(value) || value > int.MaxValue)
                problems.Add($"{name} must be a positive whole number");
            else values[name] = (int)rows[0]!.Value;
        }
        if (problems.Count == 0)
        {
            var bands = new[]
            {
                new TenureBand(values[TenureBand1DaysName], values[TenureBand1MaxStudentsName]),
                new TenureBand(values[TenureBand2DaysName], values[TenureBand2MaxStudentsName]),
                new TenureBand(values[TenureBand3DaysName], values[TenureBand3MaxStudentsName]),
                new TenureBand(values[TenureBand4DaysName], values[TenureBand4MaxStudentsName])
            };
            for (var i = 1; i < bands.Length; i++)
            {
                if (bands[i].Days <= bands[i - 1].Days)
                    problems.Add($"TutorTenureBand{i + 1}Days must be greater than TutorTenureBand{i}Days");
                if (bands[i].MaxStudents < bands[i - 1].MaxStudents)
                    problems.Add($"TutorTenureBand{i + 1}MaxStudents cannot be less than TutorTenureBand{i}MaxStudents");
            }
            if (values[TenureStandardMaxStudentsName] < bands[^1].MaxStudents)
                problems.Add($"{TenureStandardMaxStudentsName} cannot be less than {TenureBand4MaxStudentsName}");
            if (values[TenureSuperAdminMaxStudentsName] < values[TenureStandardMaxStudentsName])
                problems.Add($"{TenureSuperAdminMaxStudentsName} cannot be less than {TenureStandardMaxStudentsName}");
            if (problems.Count == 0)
            {
                error = null;
                return new TenureConfig(bands, values[TenureStandardMaxStudentsName], values[TenureSuperAdminMaxStudentsName],
                    values[TenureNewBadgeDaysName]);
            }
        }

        error = TenureThresholdNames.All(name => !activeValuesByName.ContainsKey(name))
            ? "the TutorAssignTenure threshold rows are missing"
            : string.Join("; ", problems);
        return null;
    }

    /// <summary>
    /// A tutor's tenure position, shown in the assignment tutor lists and checked on every assignment.
    /// ActiveStudents: distinct students on the tutor's active courses (active Sales and SalesDetails), this course excluded.
    /// Limit: the band's limit (the standard limit from the last band's days); null when the join date or the
    /// configuration is missing.
    /// </summary>
    public sealed record TenureStatus(DateTime? JoinDate, bool JoinDateFromAccount, int? DaysSinceJoining, string? Band,
        int ActiveStudents, int? Limit, int? SuperAdminMaxStudents, bool IsNew, Outcome Outcome, string? Message);

    public const string JoinDateMissingMessage =
        "Join date missing: set the tutor's joining date before assigning students.";

    /// <param name="joiningDate">User.JoiningDate (a calendar date).</param>
    /// <param name="accountCreatedUtc">User.CreatedDate, used when there is no joining date.</param>
    /// <param name="callerIsSuperAdmin">A Super Admin may assign above the standard limit (up to the cap) directly.</param>
    public static TenureStatus EvaluateTenure(TenureConfig? config, string? configError, DateTime? joiningDate,
        DateTime? accountCreatedUtc, int activeStudents, bool callerIsSuperAdmin, DateTime nowUtc)
    {
        var fromAccount = joiningDate == null && accountCreatedUtc is { } created && created != default;
        // A joining date saved from the user form is IST midnight stored in UTC (18:30 the previous day): converted to IST
        // before taking the date. A joining date stored without a time is already a calendar date.
        DateTime? joinDate = (joiningDate is { } joined
                ? (joined.TimeOfDay == TimeSpan.Zero ? joined.Date : DateHelper.TCTConvertTimeFromUtc(joined).Date)
                : (DateTime?)null)
            ?? (fromAccount ? DateHelper.TCTConvertTimeFromUtc(accountCreatedUtc!.Value).Date : null);
        if (joinDate == null)
            return new TenureStatus(null, false, null, null, activeStudents, null, null, false, Outcome.Blocked, JoinDateMissingMessage);
        // Whole days in IST; a join date in the future counts as day 0.
        var days = Math.Max(0, (int)(DateHelper.TCTConvertTimeFromUtc(nowUtc).Date - joinDate.Value).TotalDays);

        if (config == null)
            return new TenureStatus(joinDate, fromAccount, days, null, activeStudents, null, null, false, Outcome.Blocked,
                $"Tutor tenure limits are not configured correctly ({configError}). Please ask the Super Admin to check Threshold Configuration.");

        var isNew = days < config.NewBadgeDays;
        var bandIndex = config.Bands.ToList().FindIndex(b => days < b.Days);
        var band = bandIndex switch
        {
            -1 => $"{config.Bands[^1].Days}+ days",
            0 => $"Under {config.Bands[0].Days} days",
            _ => $"{config.Bands[bandIndex - 1].Days}–{config.Bands[bandIndex].Days - 1} days"
        };
        var limit = bandIndex == -1 ? config.StandardMaxStudents : config.Bands[bandIndex].MaxStudents;
        TenureStatus Result(Outcome outcome, string? message) =>
            new(joinDate, fromAccount, days, band, activeStudents, limit, config.SuperAdminMaxStudents, isNew, outcome, message);

        if (activeStudents >= config.SuperAdminMaxStudents)
            return Result(Outcome.Blocked,
                $"This tutor has {activeStudents} active students, the maximum of {config.SuperAdminMaxStudents}. The tutor is unavailable for new assignments until a student becomes inactive.");
        if (activeStudents < limit) return Result(Outcome.Allowed, null);
        if (bandIndex != -1)
            return Result(Outcome.Blocked,
                $"This tutor has reached the assignment limit for tutors {band} since joining: {limit} active students (currently {activeStudents}).");
        // 90+ days, at or above the standard limit and below the cap.
        return callerIsSuperAdmin ? Result(Outcome.Allowed, null) : Result(Outcome.NeedsSuperAdmin, null);
    }

    // The tenure rule added to the other rules' decision: any block stands, then a tenure block; above the standard
    // limit the tenure code joins the Super Admin request.
    public static Decision Combine(Decision decision, TenureStatus tenure)
    {
        if (decision.Outcome == Outcome.Blocked) return decision;
        if (tenure.Outcome == Outcome.Blocked)
            return new Decision(Outcome.Blocked, tenure.Message, null, false, Array.Empty<string>());
        if (tenure.Outcome != Outcome.NeedsSuperAdmin) return decision;
        var codes = decision.RuleCodes.Append(TenureOverLimitCode).ToList();
        return new Decision(Outcome.NeedsSuperAdmin, $"This assignment needs Super Admin approval: {Describe(codes)}.",
            null, false, codes);
    }

    public static string Describe(IEnumerable<string> codes) =>
        string.Join("; ", codes.Select(code => code switch
        {
            FrequencyCode => "repeat assignment of this tutor within the cooldown period",
            GradeMismatchCode => "the student's grade is not among the tutor's eligible grades",
            TenureOverLimitCode => "the tutor is above the standard active-student limit",
            _ => code
        }));

    public static string Describe(string? codesText) =>
        Describe((codesText ?? string.Empty).Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));

    // A rule request awaiting the Super Admin for the same course, tutor and requester: saving the same attempt
    // again returns it instead of creating another request.
    public static Expression<Func<TutorPaymentApproval, bool>> IsPendingRuleRequest(Guid salesDetailsId, Guid tutorId, Guid requestedBy) =>
        p => p.SalesDetailsId == salesDetailsId
             && p.TutorId == tutorId
             && p.RequestedBy == requestedBy
             && p.IsActive
             && p.ApprovalStatus == (int)TutorPaymentStatus.Pending
             && p.AssignmentRuleCodes != null;

    public const string AlreadyAwaitingSuperAdminMessage =
        "This tutor assignment is already awaiting Super Admin approval.";

    // Super Admin decision on a rule-only request: approval keeps the saved assignment (status, tutor and payment)
    // for the Coordinator Admin; rejection rolls it back like an assignment with a payment change.
    public static bool KeepsAssignmentOnApproval(int requestType) =>
        requestType == (int)TutorPaymentRequestType.AssignmentRuleApproval;

    public static bool DeactivatesAllocationOnRejection(int requestType) =>
        requestType == (int)TutorPaymentRequestType.AssignmentWithPaymentChange
        || requestType == (int)TutorPaymentRequestType.AssignmentRuleApproval;

    // Saving the course's tutor again is not a new assignment only while that tutor also has an active allocation on
    // the course; a tutor id stored on the course without one (e.g. sent at enrolment) is checked like any assignment.
    public static bool IsExistingAssignment(bool sameTutorOnCourse, bool hasActiveAllocationForTutor) =>
        sameTutorOnCourse && hasActiveAllocationForTutor;

    public enum StatusAfterApproval
    {
        // Assignment with a payment change (no assignment rule): the Super Admin approval also approves the assignment (20013).
        MoveToApproved,
        // Other payment requests: the course returns to the status it had before the request.
        RestorePrevious,
        // A request that also carries tutor assignment rules: the course keeps its current status (awaiting the
        // Coordinator Admin, 20012), so the normal assignment approval continues.
        KeepCurrent
    }

    // Course status after a Super Admin approves a payment request (the rule-only request keeps the assignment as a whole,
    // KeepsAssignmentOnApproval). Requests without assignment rule codes behave as before. The tenure rule alone (with or
    // without a payment change) needs only the Super Admin, so the approval also approves the assignment; together with
    // another rule the Coordinator Admin still decides.
    public static StatusAfterApproval StatusAfterSuperAdminApproval(int requestType, string? assignmentRuleCodes) =>
        assignmentRuleCodes != null
            ? (IsSuperAdminOnlyRule(assignmentRuleCodes)
               && (requestType == (int)TutorPaymentRequestType.AssignmentRuleApproval
                   || requestType == (int)TutorPaymentRequestType.AssignmentWithPaymentChange)
                ? StatusAfterApproval.MoveToApproved
                : StatusAfterApproval.KeepCurrent)
        : requestType == (int)TutorPaymentRequestType.AssignmentWithPaymentChange ? StatusAfterApproval.MoveToApproved
        : StatusAfterApproval.RestorePrevious;

    public static bool IsSuperAdminOnlyRule(string? assignmentRuleCodes)
    {
        var codes = (assignmentRuleCodes ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        return codes.Length > 0 && codes.All(c => c == TenureOverLimitCode);
    }

    // Decision notification for a rule-only request (AssignmentRuleApproval), which has no payment change to report.
    public static string AssignmentDecisionMessage(string? tutorName, bool approved, string? comment) =>
        $"Tutor assignment for <b>{tutorName ?? "Tutor"}</b> was <b>{(approved ? "approved" : "rejected")}</b>. " +
        $"Comment: {comment}.";

    private static string FormatIst(DateTime utc) =>
        DateHelper.TCTConvertTimeFromUtc(utc).ToString("dd MMM yyyy hh:mm tt", CultureInfo.InvariantCulture) + " IST";
}
