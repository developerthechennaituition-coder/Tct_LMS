using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.Domain.Entities
{
    public class Schedule : BaseEntity
    {
        public string? RepeatType { get; set; }
        public string? RepeatOn { get; set; }
        public Guid ScheduleId { get; set; }    
        public Guid SalesDetailsId { get; set; }    
        public Guid TutorId { get; set; }
        public Guid StudentId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string? Title { get; set; }
        public string? Description { get; set; }
        public Guid SubjectId { get; set; }
        public string? MeetingLink { get; set; }
        public string? MeetingLine { get; set; }
        public Guid? PaymentStatus { get; set; }
        public Guid? AccountsApprovalScheduleStatus { get; set; }
        public Guid? ApprovedBy { get; set; }
        public DateTime? ApprovedDate { get; set; }
        // Academic duration; EndDate is the initial batch, ScheduleEndDate is the closing limit.
        public int? NoOfMonths { get; set; }
        public DateTime? ScheduleEndDate { get; set; }
        // OneTime, Weekly, or FixedCount.
        public string? ScheduleMode { get; set; }
        // Exact occurrence limit used by FixedCount schedules.
        public int? TotalClasses { get; set; }
        // Hourly rate that pays this schedule's classes; NULL uses SalesDetails.TutorPayment.
        // Set when a Tutor Change / Student Change approval splits or moves the schedule.
        public decimal? TutorRate { get; set; }
    }
}
