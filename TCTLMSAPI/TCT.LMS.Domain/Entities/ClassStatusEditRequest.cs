using System.ComponentModel.DataAnnotations;

namespace TCT.LMS.Domain.Entities
{
    // A tutor or student asks Operations to unlock a class status they already saved.
    // Approved: the class becomes editable for them once; the next save marks the request Used.
    public class ClassStatusEditRequest
    {
        [Key]
        public Guid Id { get; set; }
        public Guid ScheduleDetailsId { get; set; }
        public Guid SalesDetailsId { get; set; }
        public Guid RequestedBy { get; set; }
        public string RequesterType { get; set; } = null!; // "tutor" or "student"
        public string? Reason { get; set; }
        public int Status { get; set; }
        public Guid? DecidedBy { get; set; }
        public DateTime? DecidedDate { get; set; }
        public string? DecisionComment { get; set; }
        public DateTime CreatedDate { get; set; }
    }

    public enum ClassStatusEditRequestStatus
    {
        Pending = 1,
        Approved = 2,
        Rejected = 3,
        Used = 4
    }
}
