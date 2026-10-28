using System.ComponentModel.DataAnnotations;

namespace TCT.LMS.Domain.Entities
{
    // Schedule Calendar: a tutor or student asks to add class day(s). Operations approve (the classes are then
    // added exactly as when Operations add them) or reject it. Status uses ClassStatusEditRequestStatus values
    // Pending / Approved / Rejected.
    public class ScheduleChangeRequest
    {
        [Key]
        public Guid Id { get; set; }
        public Guid SalesDetailsId { get; set; }
        public Guid RequestedBy { get; set; }
        public string RequesterType { get; set; } = null!; // "tutor" or "student"
        public DateTime FromDate { get; set; }
        public string Days { get; set; } = null!;          // e.g. "1,3" (0 = Sunday)
        public string StartTime { get; set; } = null!;     // "HH:mm"
        public string EndTime { get; set; } = null!;
        public int Weeks { get; set; }                     // 1-4, 0 = Permanent
        public string? Summary { get; set; }               // e.g. "2 class(es) on Thursday (2 weeks)"
        public int Status { get; set; }
        public Guid? DecidedBy { get; set; }
        public DateTime? DecidedDate { get; set; }
        public string? DecisionComment { get; set; }
        public DateTime CreatedDate { get; set; }
        // null = add class day(s); "PermanentReschedule" = move the weekly class ScheduleDetailsId to the slot above.
        public string? RequestKind { get; set; }
        public Guid? ScheduleDetailsId { get; set; }
    }
}
