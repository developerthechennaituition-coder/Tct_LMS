using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Domain;

namespace TCT.LMS.DTOs.Schedule
{
    public class ScheduleDTO : BaseEntity
    {
        public Guid? ScheduleId { get; set; }
        public Guid? ScheduleDetailsId { get; set; }
        public Guid? SalesId { get; set; }
        public Guid? SalesDetailsId { get; set; }
        public Guid? TutorUserId { get; set; }
        public Guid? StudentUserId { get; set; }
        public Guid? TutorId { get; set; }
        public Guid? StudentId { get; set; }
        public string? StringStartDate { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int? NoOfMonths { get; set; }
        public string? ScheduleMode { get; set; }
        public int? TotalClasses { get; set; }
        public DateTime? Date { get; set; }
        public DateTime? StartTime { get; set; }
        public DateTime? EndTime { get; set; }
        public string? ScheduleType { get; set; }
        public string? Comment { get; set; }
        public string? Status { get; set; }
        public string? TutorName { get; set; }
        public string? StudentName { get; set; }
        public string? SubjectName { get; set; }
        public Guid? SubjectId { get; set; }

        public ScheduleDetailsDto ScheduleDetailsDto { get; set; }
        public Guid? ScheduleStatus { get; set; }
        public int AccountsApprovalStatusCode { get; set; }
        public int ScheduleStatusCode { get; set; }
        public string? ScheduleStatusName { get; set; }
        public string? Title { get; set; }
        public string? Description { get; set; }
        public string? TutorComment { get; set; }
        public string? StudentComment { get; set; }
        public string? MeetingLink { get; set; }
        public Guid? TutorScheduleStatus { get; set; }
        public Guid? StudentScheduleStatus { get; set; }
        public Guid? OperationScheduleStatus { get; set; }
        public bool? IsTutorPresent { get; set; }
        public bool? IsStudentPresent { get; set; }
        public bool DisableActions { get; set; }
        // Tutor/student calendar: their latest request to unlock this class status (Pending / Approved / Rejected), if any.
        public string? EditRequestStatus { get; set; }
        public int ClassStatusCode { get; set; }
        public string? CoordinatorComment { get; set; }
    }
}
