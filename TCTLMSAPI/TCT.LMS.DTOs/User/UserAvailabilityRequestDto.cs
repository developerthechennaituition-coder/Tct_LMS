using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Domain;

namespace TCT.LMS.DTOs.User
{
    public class UserAvailabilityRequestDto : BaseEntity
    {

        public Guid? UserAvailabilityId { get; set; }
        public Guid? UserAvailabilityExceptionId { get; set; }

        [Required]
        public Guid UserId { get; set; }
        public int RoleId { get; set; }

        [Required]
        public Guid UserType { get; set; }

        [Required]
        [MaxLength(10)]
        public string DayOfWeek { get; set; }

        public DateTime? StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        [Required]
        public DateTime StartTime { get; set; }

        [Required]
        public DateTime EndTime { get; set; }

        [MaxLength(250)]
        public string? TimeZone { get; set; }

        public bool IsRecurring { get; set; } = false;
        public bool IsAvailable { get; set; } = true;


    }

    public class RemoveSlot
    {
        public Guid Id { get; set; }
        public Guid LoggedInUserId { get; set; }
    }
    public class UserTimeSlots : IValidatableObject
    {
        public Guid LoggedInUserId { get; set; }
        public bool IsRecurring { get; set; } = false;
        public Guid UserId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public List<Slot> SlotList { get; set; }

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            if (UserId == Guid.Empty) yield return new ValidationResult("UserId is required.", new[] { nameof(UserId) });
            if (StartDate == default) yield return new ValidationResult("Start date is required.", new[] { nameof(StartDate) });
            if (!IsRecurring && (!EndDate.HasValue || EndDate.Value.Date < StartDate.Date))
                yield return new ValidationResult("End date must be on or after start date.", new[] { nameof(EndDate) });
            if (SlotList == null || SlotList.Count == 0)
            {
                yield return new ValidationResult("Select at least one time slot.", new[] { nameof(SlotList) });
                yield break;
            }
            if (SlotList.Any(slot => slot == null || !Enum.TryParse<DayOfWeek>(slot.Day, true, out var day) || !Enum.IsDefined(day)
                || slot.StartTime < TimeSpan.Zero || slot.EndTime > TimeSpan.FromDays(1) || slot.StartTime >= slot.EndTime))
                yield return new ValidationResult("Each slot needs a valid weekday and an end time after its start time.", new[] { nameof(SlotList) });
        }
    }

    public class Slot
    {
        public Guid? Id { get; set; }
        public int DayofWeek { get; set; }
        public string Day { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
    }

    public class ScheduleSlot
    {
        public Guid SlotId { get; set; }
        public int DayInNo { get; set; }
        public int UniqueId { get; set; }
        public string DayOfWeek { get; set; }
        public string StartTime { get; set; }
        public int StartMinutes { get; set; }
        public string EndTime { get; set; }
        public int EndMinutes { get; set; }
        public int MinMinutes { get; set; }
        public int MaxMinutes { get; set; }
        public string SelectedTime { get; set; }
    }

    public class DaySchedule
    {
        public int DayInNo { get; set; }
        public string DayOfWeek { get; set; }
        public List<ScheduleSlot> Slots { get; set; }
        public int StartMinutes { get; set; }
        public int EndMinutes { get; set; }
        public int MinMinutes { get; set; }
        public int MaxMinutes { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public bool IsRecurring { get; set; }
    }


    public class AvailableTimeSlot
    {
        public AvailableTimeSlot(DayOfWeek day, DateTime start, DateTime end, string dayOfWeek)
        {
            Day = day;
            StartTime = start;
            EndTime = end;
            DayOfWeek = dayOfWeek;
        }
        public DayOfWeek Day { get; set; }
        public string DayOfWeek { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
    }

    // A user's free time and their already-booked classes over a date range.
    public class UserAvailableSlotsDto
    {
        public List<AvailableTimeSlot> Available { get; set; } = new();
        public List<AvailableTimeSlot> Booked { get; set; } = new();
    }

    // Student vs tutor free time over a date range, for Operations handling a re-schedule request.
    public class AvailabilityComparisonDto
    {
        public UserAvailableSlotsDto Student { get; set; } = new();
        public UserAvailableSlotsDto Tutor { get; set; } = new();
        public List<AvailableTimeSlot> Common { get; set; } = new();       // both free
        public List<AvailableTimeSlot> StudentOnly { get; set; } = new();  // student free, tutor not
        public List<AvailableTimeSlot> TutorOnly { get; set; } = new();    // tutor free, student not
    }

    public class TimeSlotsGroup
    {
        public ScheduleType? ScheduleType { get; set; }
        public Guid? UserId { get; set; }
        public string? MeetingLink { get; set; }
        public string? Comment { get; set; }
        public string? Title { get; set; }
        public Guid TutorId { get; set; }
        public Guid StudentId { get; set; }
        public Guid SubjectId { get; set; }
        public Guid SalesId { get; set; }
        public Guid SalesDetailsId { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int? NoOfMonths { get; set; }
        public DateTime? ScheduleEndDate { get; set; }
        public string? ScheduleMode { get; set; }
        public int? TotalClasses { get; set; }
        public DayOfWeek DayInNo { get; set; }
        public string Day { get; set; } = string.Empty;
        public bool IsRecurrence { get; set; }
        public List<TimeSlotsGroup>? TimeSlotGroup { get; set; }
        public List<TimeSlot>? TimeSlots { get; set; }
        public Guid? ScheduleStatus { get; set; }
        public bool IsReschedule { get; set; }
    }

    public class TimeSlot
    {
        public string Day { get; set; } // Added day property
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public DateTime? StartTime1 { get; set; }
        public DateTime? EndTime1 { get; set; }
        public bool IsAllocated { get; set; } // Added allocation flag
        public string Color { get; set; }
        public string? ScheduleType { get; set; }

        public TimeSlot()
        {
        }

        public TimeSlot(string day, TimeSpan start, TimeSpan end, string color, bool isAllocated = false)
        {
            Color = color;
            Day = day;
            StartTime = start;
            EndTime = end;
            IsAllocated = isAllocated;
        }
    }
}
