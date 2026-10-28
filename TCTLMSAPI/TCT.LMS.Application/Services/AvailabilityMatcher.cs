using TCT.LMS.DTOs.User;

namespace TCT.LMS.Application.Services;

public static class AvailabilityMatcher
{
    // Evaluate recurring ranges and dated exceptions using the selected local
    // calendar date, never the server clock or the date a recurring slot was created.
    public static List<AvailableTimeSlot> ForDate(IEnumerable<UserAvailabilityRequestDto> rows, DateTime date)
    {
        date = date.Date;
        var applicable = rows.Where(row =>
        {
            var start = (row.StartDate ?? row.StartTime).Date;
            var end = row.EndDate?.Date ?? (row.IsRecurring ? DateTime.MaxValue.Date : start);
            var dayMatches = string.IsNullOrWhiteSpace(row.DayOfWeek)
                ? !row.IsRecurring
                : Enum.TryParse<DayOfWeek>(row.DayOfWeek, true, out var day) && day == date.DayOfWeek;
            return row.IsActive && date >= start && date <= end && dayMatches
                && row.StartTime.TimeOfDay < row.EndTime.TimeOfDay;
        }).ToList();
        var available = applicable.Where(row => row.IsAvailable)
            .Select(row => (Start: row.StartTime.TimeOfDay, End: row.EndTime.TimeOfDay)).ToList();
        foreach (var blocked in applicable.Where(row => !row.IsAvailable))
        {
            var start = blocked.StartTime.TimeOfDay;
            var end = blocked.EndTime.TimeOfDay;
            available = available.SelectMany(slot =>
            {
                if (slot.End <= start || slot.Start >= end) return new[] { slot }.ToList();
                var pieces = new List<(TimeSpan Start, TimeSpan End)>();
                if (slot.Start < start) pieces.Add((slot.Start, start));
                if (slot.End > end) pieces.Add((end, slot.End));
                return pieces;
            }).ToList();
        }
        // Merge overlapping/adjacent positive windows to avoid duplicated slots.
        var merged = new List<(TimeSpan Start, TimeSpan End)>();
        foreach (var slot in available.OrderBy(slot => slot.Start))
        {
            if (merged.Count == 0 || slot.Start > merged[^1].End) merged.Add(slot);
            else if (slot.End > merged[^1].End) merged[^1] = (merged[^1].Start, slot.End);
        }
        return merged.Select(slot => new AvailableTimeSlot(date.DayOfWeek,
            date.Add(slot.Start), date.Add(slot.End), date.DayOfWeek.ToString())).ToList();
    }

    // Remove busy periods (e.g. already-booked classes) from free slots, splitting a slot around each one.
    public static List<AvailableTimeSlot> Subtract(IEnumerable<AvailableTimeSlot> slots, IEnumerable<AvailableTimeSlot> busy)
    {
        var free = slots.Select(s => (s.StartTime, s.EndTime)).ToList();
        foreach (var b in busy)
        {
            free = free.SelectMany(slot =>
            {
                if (slot.EndTime <= b.StartTime || slot.StartTime >= b.EndTime) return new[] { slot }.ToList();
                var pieces = new List<(DateTime StartTime, DateTime EndTime)>();
                if (slot.StartTime < b.StartTime) pieces.Add((slot.StartTime, b.StartTime));
                if (slot.EndTime > b.EndTime) pieces.Add((b.EndTime, slot.EndTime));
                return pieces;
            }).ToList();
        }
        return free.Select(s => new AvailableTimeSlot(s.StartTime.DayOfWeek, s.StartTime, s.EndTime,
            s.StartTime.DayOfWeek.ToString())).ToList();
    }

    // Periods where both lists have free time (e.g. student and tutor are both available).
    public static List<AvailableTimeSlot> Intersect(IEnumerable<AvailableTimeSlot> first, IEnumerable<AvailableTimeSlot> second)
    {
        var others = second.ToList();
        return first.SelectMany(a => others
                .Where(b => a.StartTime < b.EndTime && b.StartTime < a.EndTime)
                .Select(b => (Start: a.StartTime > b.StartTime ? a.StartTime : b.StartTime,
                              End: a.EndTime < b.EndTime ? a.EndTime : b.EndTime)))
            .OrderBy(s => s.Start)
            .Select(s => new AvailableTimeSlot(s.Start.DayOfWeek, s.Start, s.End, s.Start.DayOfWeek.ToString()))
            .ToList();
    }

    // Every calendar date from `from` to `to` (inclusive), each evaluated with ForDate.
    public static List<AvailableTimeSlot> ForRange(IEnumerable<UserAvailabilityRequestDto> rows, DateTime from, DateTime to)
    {
        var list = rows.ToList();
        var slots = new List<AvailableTimeSlot>();
        for (var date = from.Date; date <= to.Date; date = date.AddDays(1))
            slots.AddRange(ForDate(list, date));
        return slots;
    }
}
