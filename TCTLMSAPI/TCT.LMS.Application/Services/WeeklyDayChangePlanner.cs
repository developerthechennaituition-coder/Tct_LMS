namespace TCT.LMS.Application.Services;

// Schedule Calendar: Operations add weekday(s) to a student's weekly classes, either for
// 1-4 weeks (temporary) or permanently. Works out the class dates; creates nothing.
public static class WeeklyDayChangePlanner
{
    // Schedule.ScheduleMode of the separate header holding 1-4 week classes. Next-month rollover
    // copies only "Weekly" schedules, so temporary days are never carried into later months.
    public const string TemporaryScheduleMode = "Temporary";
    public const int PermanentWeeks = 0;
    public const int MaxTemporaryWeeks = 4;

    // Null when valid, otherwise the reason the request cannot be planned.
    public static string? Validate(DateTime fromDate, IReadOnlyCollection<DayOfWeek> days, TimeSpan start, TimeSpan end,
        int weeks, DateTime today)
    {
        if (days.Count == 0) return "Select at least one day.";
        if (start >= end) return "End time must be later than start time.";
        if (start < TimeSpan.Zero || end > TimeSpan.FromDays(1)) return "Enter a valid start and end time.";
        if (weeks < PermanentWeeks || weeks > MaxTemporaryWeeks) return "Choose 1 to 4 weeks, or Permanent.";
        if (fromDate.Date < today.Date) return "The start date cannot be in the past.";
        return null;
    }

    // Last date the change applies to: N full weeks from fromDate, or permanentUntil for Permanent.
    public static DateTime LastDate(DateTime fromDate, int weeks, DateTime permanentUntil) =>
        weeks == PermanentWeeks ? permanentUntil.Date : fromDate.Date.AddDays(7 * weeks - 1);

    // Every class (start, end) on the chosen days from fromDate to lastDate, in date order.
    public static List<(DateTime Start, DateTime End)> Occurrences(DateTime fromDate, DateTime lastDate,
        IReadOnlyCollection<DayOfWeek> days, TimeSpan start, TimeSpan end)
    {
        var result = new List<(DateTime Start, DateTime End)>();
        for (var date = fromDate.Date; date <= lastDate.Date; date = date.AddDays(1))
            if (days.Contains(date.DayOfWeek))
                result.Add((date + start, date + end));
        return result;
    }

    public static string DurationLabel(int weeks) =>
        weeks == PermanentWeeks ? "Permanent" : weeks == 1 ? "1 week" : $"{weeks} weeks";
}
