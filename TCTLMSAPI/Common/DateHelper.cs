namespace Common
{
    public class DateHelper
    {
        public static List<DateTime> FindRepeatingDays(DateTime startDate, DateTime endDate, DayOfWeek[] daysToRepeat)
        {
            List<DateTime> repeatingDates = new List<DateTime>();

            for (DateTime currentDate = startDate; currentDate <= endDate; currentDate = currentDate.AddDays(1))
            {
                if (daysToRepeat.Contains(currentDate.DayOfWeek))
                {
                    repeatingDates.Add(currentDate);
                }
            }

            return repeatingDates;
        }
        public static DateTime TCTConvertTimeFromUtc(DateTime date, string timezoneName = "")
        {
            try
            {
                TimeZoneInfo istTimeZone = TimeZoneInfo.FindSystemTimeZoneById(timezoneName == "" ? "India Standard Time" : timezoneName);
                var result = TimeZoneInfo.ConvertTimeFromUtc(date, istTimeZone);
                return result;
            }
            catch
            {
                return date;
            }
        }
    }
}


public class EventSlotValidator
{
    // Represents an event with start and end times
    public class Event
    {
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }

        public Event(DateTime startTime, DateTime endTime)
        {
            if (startTime > endTime)
                throw new ArgumentException("Start time must be before end time.");

            StartTime = startTime;
            EndTime = endTime;
        }
    }

    /// <summary>
    /// Checks if a proposed time slot overlaps with any existing events
    /// </summary>
    /// <param name="events">List of existing events</param>
    /// <param name="proposedStart">Start time of the proposed slot</param>
    /// <param name="proposedEnd">End time of the proposed slot</param>
    /// <returns>True if the slot is already allocated, false if it's available</returns>
    public static bool IsSlotAllocated(List<Event> events, DateTime proposedStart, DateTime proposedEnd)
    {
        // Validate input
        if (proposedStart >= proposedEnd)
            throw new ArgumentException("Proposed start time must be before proposed end time.");

        // Check for any overlap with existing events
        return events.Any(existingEvent =>
            // Check if the proposed slot starts during an existing event
            (proposedStart >= existingEvent.StartTime && proposedStart < existingEvent.EndTime) ||
            // Check if the proposed slot ends during an existing event
            (proposedEnd > existingEvent.StartTime && proposedEnd <= existingEvent.EndTime) ||
            // Check if the proposed slot completely encompasses an existing event
            (proposedStart <= existingEvent.StartTime && proposedEnd >= existingEvent.EndTime)
        );
    }

    /// <summary>
    /// Attempts to add a new event, checking for conflicts
    /// </summary>
    /// <param name="events">List of existing events</param>
    /// <param name="newEvent">New event to add</param>
    /// <returns>True if the event can be added, false if there's a conflict</returns>
    public static bool TryAddEvent(List<Event> events, Event newEvent)
    {
        // Check if the new event conflicts with any existing events
        if (IsSlotAllocated(events, newEvent.StartTime, newEvent.EndTime))
        {
            return false; // Slot is already allocated
        }

        // If no conflicts, add the event
        //events.Add(newEvent);
        return true;
    }

    // Example usage method
    public static void TestScenarios()
    {
        // Create an initial list of events
        var events = new List<Event>
        {
            new Event(DateTime.Parse("2024-01-01 09:00"), DateTime.Parse("2024-01-01 10:00")),
            new Event(DateTime.Parse("2024-01-01 11:30"), DateTime.Parse("2024-01-01 12:30")),
            new Event(DateTime.Parse("2024-01-01 14:00"), DateTime.Parse("2024-01-01 15:30"))
        };

        // Test cases for slot allocation
        var testCases = new[]
        {
            // Completely new slot
            (DateTime.Parse("2024-01-01 16:00"), DateTime.Parse("2024-01-01 17:00"), false),
            
            // Slot overlapping existing event
            (DateTime.Parse("2024-01-01 09:30"), DateTime.Parse("2024-01-01 10:30"), true),
            
            // Slot completely inside an existing event
            (DateTime.Parse("2024-01-01 14:15"), DateTime.Parse("2024-01-01 15:15"), true),
            
            // Slot encompassing an existing event
            (DateTime.Parse("2024-01-01 08:00"), DateTime.Parse("2024-01-01 16:00"), true)
        };

        // Demonstrate slot validation
        Console.WriteLine("Slot Allocation Test Results:");
        foreach (var (start, end, expectedResult) in testCases)
        {
            bool isAllocated = IsSlotAllocated(events, start, end);
            Console.WriteLine($"Slot {start} - {end}: " +
                $"Allocated = {isAllocated}, " +
                $"Expected = {expectedResult}, " +
                $"Correct = {isAllocated == expectedResult}");
        }

        // Demonstrate adding a new event
        var newEvent = new Event(DateTime.Parse("2024-01-01 16:00"), DateTime.Parse("2024-01-01 17:00"));
        bool canAddEvent = TryAddEvent(events, newEvent);
        Console.WriteLine($"\nAdding new event {newEvent.StartTime} - {newEvent.EndTime}: " +
            $"Success = {canAddEvent}");
    }
}
