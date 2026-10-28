using Microsoft.AspNetCore.Http;
using TCT.LMS.Domain;

namespace TCT.LMS.DTOs.Schedule;

public class TCTEvent
{
    public Guid? SalesDetailsId { get; set; }
    public string? GuestType { get; set; }
    public Guid ScheduleDetailsId { get; set; }
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public string? NoteText { get; set; }
    public Guid? UserId { get; set; }
    public Guid? EventStatus { get; set; }
    public Guid? DocumentTypeId { get; set; }
    public int Rating { get; set; }
    public bool IsActive { get; set; }
    public IList<IFormFile>? Files { get; set; }
    // "Request for Re-schedule" by a tutor/student: "Temporary" (this class only, Operations are notified) or
    // "Permanent" (the weekly class moves to the preferred slot once Operations approve).
    public string? RescheduleType { get; set; }
    public DateTime? PreferredStartTime { get; set; }
    public DateTime? PreferredEndTime { get; set; }
}

public class ScheduleDetailsDto : BaseEntity
{
    public Guid? StudentUserId { get; set; }
    public Guid? TutorUserId { get; set; }
    public string GuestType { get; set; }
    public Guid ScheduleDetailsId { get; set; }
    public Guid ScheduleId { get; set; }
    public DateTime? Date { get; set; }
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public string? ScheduleType { get; set; }
    public string? TutorComment { get; set; }
    public string? NoteText { get; set; }
    public string? Status { get; set; }
    public Guid? TutorScheduleStatus { get; set; }
    public Guid? StudentScheduleStatus { get; set; }
    public string? TutorScheduleStatusName { get; set; }
    public string? StudentScheduleStatusName { get; set; }
    public string? TutorName { get; set; }
    public string? StudentName { get; set; }
    public string? Board { get; set; }
    public string? Grade { get; set; }
    public string? Subject { get; set; }
    public Guid? UserId { get; set; }
    public bool? IsTutorPresent { get; set; }
    public bool? IsStudentPresent { get; set; }
    public string? CoordiatorComment { get; set; }
    public string? Title { get; set; }
    public string? MeetingLink { get; set; }
    public string? RecurringDay { get; set; }
    public Guid? EventStatus { get; set; }
}

public class DemoRegistrationEmailContextDto
{
    public bool IsDemo { get; set; }
    public bool IsAlreadyCompleted { get; set; }
    public string? StudentName { get; set; }
    public string? EmailAddress { get; set; }
}

public class UpdateClass
{
    public string MeetingLink { get; set; }
    public string Comment { get; set; }
    public string Title { get; set; }
    public Guid ScheduleDetailsId { get; set; }
    public Guid ScheduleId { get; set; }
    public DateTime? Date { get; set; }
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public Guid UserId { get; set; }
    public Guid TutorId { get; set; }
    public Guid StudentId { get; set; }
    public bool CanUpdateDate { get; set; } = false;
    public DateTime? StartTimeOld { get; set; }
    public DateTime? EndTimeOld { get; set; }
}
