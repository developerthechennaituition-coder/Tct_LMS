using System.Globalization;
using TCT.LMS.Domain;

namespace TCT.LMS.Application.Services;

/// <summary>
/// Tutor class cancellation thresholds (Threshold Configuration, group "TutorCancellation"):
///   - per tutor (all their students and subjects) and calendar month of the cancelled class, the tutor may set
///     Class Cancelled (1009002) on as many regular classes as the allowance for the tutor's weekly class count;
///     the weekly count is the number of distinct weekday + start time slots of the tutor's regular classes that month;
///     a weekly band "TutorCancelAllowedPerMonth_Weekly{N}" applies from N classes a week up to the next configured band,
///     so an administrator can add higher bands (e.g. _Weekly8, _Weekly12) for tutors with more classes;
///   - every cancelled class needs its own make-up class (approved by Operations); one make-up satisfies one cancellation;
///   - a tutor-cancelled class without an approved make-up by the end of its month is deducted at that month's payroll:
///     the configured percentage of the class's pay (the existing rounded-hours x hourly-rate formula).
/// Student cancellations and Operations' statuses never count against the tutor. Missing or invalid configuration
/// blocks tutor cancellations instead of guessing.
/// </summary>
public static class TutorCancellationRules
{
    public const string GroupKey = "TutorCancellation";
    public const string WeeksPerMonthName = "TutorCancelWeeksPerMonth";
    public const string AllowanceNamePrefix = "TutorCancelAllowedPerMonth_Weekly";
    public const string DeductionPercentName = "TutorCancelUnrescheduledDeductionPercent";

    // The weekly class counts that must have an allowance (the configured table: 1-7 classes a week).
    public const int RequiredMinWeekly = 1;
    public const int RequiredMaxWeekly = 7;
    private const int MaxWeeklyBand = 200;
    private const int MaxWeeksPerMonth = 5;

    public const string TutorCategory = "tutor";
    public const string StudentCategory = "student";

    public const int CancelledStatusCode = (int)ClassStatusType.ClassCancelled;

    // "Class Re-Scheduled": set on the original class by the existing Reschedule Class flow after the new class is saved.
    public static bool IsRescheduledStatusCode(int? code) =>
        code == (int)ClassStatusType.ClassRescheduled || code == (int)FollowUpStatus.ClassReScheduled;

    public sealed record Config(int WeeksPerMonth, IReadOnlyDictionary<int, int> AllowanceByWeekly, decimal DeductionPercent);

    public static string AllowanceName(int weeklyClasses) => AllowanceNamePrefix + weeklyClasses.ToString(CultureInfo.InvariantCulture);

    public static bool IsRuleThreshold(string? name) =>
        name != null && (name == WeeksPerMonthName || name == DeductionPercentName || WeeklyBandOf(name).HasValue);

    // "TutorCancelAllowedPerMonth_Weekly3" -> 3; null for any other name.
    public static int? WeeklyBandOf(string? name) =>
        name != null && name.StartsWith(AllowanceNamePrefix, StringComparison.Ordinal)
        && int.TryParse(name[AllowanceNamePrefix.Length..], NumberStyles.None, CultureInfo.InvariantCulture, out var weekly)
        && weekly >= 1 && weekly <= MaxWeeklyBand ? weekly : null;

    // One value on its own (Threshold Configuration save). weeksPerMonth: the saved weeks per month, when known,
    // so an allowance cannot exceed the classes of the month. Null when valid, otherwise the reason.
    public static string? ValidateValue(string name, decimal? value, int? weeksPerMonth)
    {
        if (value is not { } v) return $"{name} needs a value.";
        if (name == DeductionPercentName)
            return v < 0 || v > 100 ? $"{name} must be between 0 and 100." : null;
        if (v != decimal.Truncate(v)) return $"{name} must be a whole number.";
        if (name == WeeksPerMonthName)
            return v < 1 || v > MaxWeeksPerMonth ? $"{name} must be between 1 and {MaxWeeksPerMonth}." : null;
        if (WeeklyBandOf(name) is { } weekly)
        {
            if (v < 0) return $"{name} cannot be negative.";
            if (weeksPerMonth is { } weeks && v > weekly * weeks)
                return $"{name} cannot be more than the {weekly * weeks} classes of the month ({weekly} a week x {weeks} weeks).";
            return null;
        }
        return null;
    }

    // Every name needs exactly one active row (a second active row would be an overlapping band) with a valid value,
    // and the weekly counts 1-7 must each have an allowance. Null (with the reasons) otherwise.
    public static Config? ReadConfig(IEnumerable<(string Name, decimal? Value)> activeRows, out string? error)
    {
        var rows = activeRows.Where(r => IsRuleThreshold(r.Name)).GroupBy(r => r.Name).ToDictionary(g => g.Key, g => g.ToList());
        var problems = new List<string>();
        foreach (var duplicate in rows.Where(r => r.Value.Count > 1).Select(r => r.Key).OrderBy(n => n))
            problems.Add($"{duplicate} is configured more than once");

        decimal? Single(string name) => rows.TryGetValue(name, out var found) && found.Count == 1 ? found[0].Value : null;
        bool Has(string name) => rows.ContainsKey(name);

        int? weeks = null;
        if (!Has(WeeksPerMonthName)) problems.Add($"{WeeksPerMonthName} is missing or inactive");
        else if (rows[WeeksPerMonthName].Count == 1)
        {
            var invalid = ValidateValue(WeeksPerMonthName, Single(WeeksPerMonthName), null);
            if (invalid != null) problems.Add(invalid.TrimEnd('.'));
            else weeks = (int)Single(WeeksPerMonthName)!.Value;
        }

        decimal? percent = null;
        if (!Has(DeductionPercentName)) problems.Add($"{DeductionPercentName} is missing or inactive");
        else if (rows[DeductionPercentName].Count == 1)
        {
            var invalid = ValidateValue(DeductionPercentName, Single(DeductionPercentName), null);
            if (invalid != null) problems.Add(invalid.TrimEnd('.'));
            else percent = Single(DeductionPercentName);
        }

        var allowance = new Dictionary<int, int>();
        foreach (var (name, values) in rows.Where(r => WeeklyBandOf(r.Key).HasValue).OrderBy(r => WeeklyBandOf(r.Key)))
        {
            if (values.Count != 1) continue;
            var invalid = ValidateValue(name, values[0].Value, weeks);
            if (invalid != null) problems.Add(invalid.TrimEnd('.'));
            else allowance[WeeklyBandOf(name)!.Value] = (int)values[0].Value!.Value;
        }
        for (var weekly = RequiredMinWeekly; weekly <= RequiredMaxWeekly; weekly++)
            if (!Has(AllowanceName(weekly))) problems.Add($"{AllowanceName(weekly)} is missing or inactive");

        if (problems.Count > 0 || weeks == null || percent == null)
        {
            error = string.Join("; ", problems);
            return null;
        }
        error = null;
        return new Config(weeks.Value, allowance, percent.Value);
    }

    // Distinct weekday + start time (to the minute) of the course's regular classes in the month.
    public static int WeeklyClassCount(IEnumerable<DateTime> regularClassStarts) =>
        regularClassStarts.Select(s => (s.DayOfWeek, s.Hour, s.Minute)).Distinct().Count();

    public static int MonthlyClasses(Config config, int weeklyClasses) => weeklyClasses * config.WeeksPerMonth;

    // The configured band covering this weekly count: the highest band start at or below it (bands 1-7 are required,
    // so every tutor with at least one weekly class has one). Null for no weekly classes.
    public static int? BandFor(Config config, int weeklyClasses) =>
        weeklyClasses < 1 ? null
        : config.AllowanceByWeekly.Keys.Where(start => start <= weeklyClasses).Select(start => (int?)start).Max();

    public static int? Allowance(Config config, int weeklyClasses) =>
        BandFor(config, weeklyClasses) is { } band ? config.AllowanceByWeekly[band] : null;

    public static DateTime MonthStart(DateTime date) => new(date.Year, date.Month, 1);
    public static DateTime NextMonthStart(DateTime date) => MonthStart(date).AddMonths(1);

    public sealed record Usage(int WeeklyClasses, int MonthlyClasses, int? Allowed, int Used, string? ConfigError)
    {
        public int Remaining => Allowed is { } allowed ? Math.Max(0, allowed - Used) : 0;
        public bool CanCancel => ConfigError == null && Allowed is { } allowed && Used < allowed;
    }

    // usedThisMonth: the tutor's other cancellations (this class excluded) in the class's calendar month.
    public static Usage Evaluate(Config? config, string? configError, int weeklyClasses, int usedThisMonth)
    {
        if (config == null)
            return new Usage(weeklyClasses, 0, null, usedThisMonth, configError ?? "configuration not found");
        return new Usage(weeklyClasses, MonthlyClasses(config, weeklyClasses), Allowance(config, weeklyClasses), usedThisMonth, null);
    }

    // Shown when the tutor is stopped from cancelling.
    public static string BlockedMessage(Usage usage, DateTime classDate)
    {
        var month = classDate.ToString("MMMM yyyy", CultureInfo.InvariantCulture);
        if (usage.ConfigError != null)
            return "Class cancellation is not available because the Tutor Cancellation Threshold Configuration is invalid " +
                   $"({usage.ConfigError}). Please contact Operations, or re-schedule the class instead.";
        if (usage.WeeklyClasses == 0 || usage.Allowed == null)
            return "Only regular weekly classes can be cancelled. Please re-schedule this class instead.";
        return $"You have used {usage.Used} of {usage.Allowed} cancellation(s) allowed across all your classes in {month} " +
               $"({usage.WeeklyClasses} class(es) a week, {usage.MonthlyClasses} a month). Please re-schedule the class instead.";
    }

    // Shown before the tutor confirms a cancellation.
    public static string SummaryMessage(Usage usage, DateTime classDate, int pendingMakeups, decimal deductionPercent)
    {
        if (!usage.CanCancel) return BlockedMessage(usage, classDate);
        var month = classDate.ToString("MMMM yyyy", CultureInfo.InvariantCulture);
        return $"You have used {usage.Used} of {usage.Allowed} cancellation(s) across all your classes in {month}; " +
               $"{usage.Remaining} remaining. Every cancelled class must be re-scheduled with a make-up class by the end of the month, " +
               $"otherwise {deductionPercent:0.##}% of that class's fee is deducted." +
               (pendingMakeups > 0 ? $" {pendingMakeups} cancelled class(es) still need a make-up." : "");
    }

    // Re-scheduled in time: the make-up was approved before the end of the cancelled class's month.
    public static bool RescheduledByDeadline(DateTime classDate, DateTime? rescheduledAt) =>
        rescheduledAt.HasValue && rescheduledAt.Value < NextMonthStart(classDate);

    public enum DeductionDecision { NotDue, Deduct, Uncertain }

    /// <summary>
    /// At the payroll of payrollMonth (or the first payslip after it), for one tracked cancellation:
    /// NotDue - not a tutor cancellation, withdrawn, already deducted, its month not ended yet (today, IST), or
    ///          re-scheduled (linked make-up) by its month end;
    /// Deduct - certainly not re-scheduled in time: no make-up linked and the class is still active and still the tutor's
    ///          Class Cancelled, or a make-up linked only after the deadline;
    /// Uncertain - no make-up linked, but the class was changed or removed after it was cancelled (e.g. set Re-Scheduled
    ///          without a linked class) or a make-up was approved without its class being identified: never deducted,
    ///          reported for review instead.
    /// </summary>
    public static DeductionDecision DecideDeduction(string category, bool countsAgainstAllowance, bool isActive, DateTime classDate,
        DateTime? rescheduledAt, long? deductionInvoiceId, int payrollYear, int payrollMonth, DateTime today,
        bool classStillCancelledByTutor, bool makeupApprovedWithoutClass)
    {
        if (category != TutorCategory || !countsAgainstAllowance || !isActive || deductionInvoiceId != null
            || classDate >= new DateTime(payrollYear, payrollMonth, 1).AddMonths(1) || NextMonthStart(classDate) > today.Date)
            return DeductionDecision.NotDue;
        if (rescheduledAt.HasValue)
            return RescheduledByDeadline(classDate, rescheduledAt) ? DeductionDecision.NotDue : DeductionDecision.Deduct;
        return classStillCancelledByTutor && !makeupApprovedWithoutClass ? DeductionDecision.Deduct : DeductionDecision.Uncertain;
    }

    // The class's pay with the payroll formula (TutorPayrollSummary.ClassAmount), times the configured percentage.
    public static decimal DeductionAmount(DateTime start, DateTime end, decimal hourlyRate, decimal percent) =>
        Math.Round(TutorPayrollSummary.ClassAmount(start, end, hourlyRate) * percent / 100m, 2, MidpointRounding.AwayFromZero);

    public static string DeductionNotificationMessage(string? studentName, string? subject, DateTime classStart,
        decimal percent, decimal amount, string? invoiceNumber) =>
        $"Your cancelled class with <b>{studentName ?? "your student"}</b>" +
        (string.IsNullOrWhiteSpace(subject) ? "" : $" ({subject})") +
        $" on <b>{classStart:dd-MMM-yyyy hh:mm tt}</b> was not re-scheduled by the end of {classStart:MMMM yyyy}. " +
        $"As per the cancellation policy, <b>{percent:0.##}%</b> of that class's fee (<b>{amount:0.00} INR</b>) " +
        "is deducted" + (string.IsNullOrWhiteSpace(invoiceNumber) ? "." : $" in pay slip {invoiceNumber}.");
}
