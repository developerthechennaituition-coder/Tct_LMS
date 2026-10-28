using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.Domain.Entities
{
    public class ScheduleDetails : BaseEntity
    {
        public Guid ScheduleDetailsId { get; set; }
        public Guid ScheduleId { get; set; }
        public DateTime Date { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public DateTime? StudentStartTime { get; set; }
        public DateTime? StudentEndTime { get; set; }
        public DateTime? TutorStartTime { get; set; }
        public DateTime? TutorEndTime { get; set; }
        public DateTime? OperationStartTime { get; set; }
        public DateTime? OperationEndTime { get; set; }
        public string? ScheduleType { get; set; }
        public string? TutorComment { get; set; }
        public string? StudentComment { get; set; }
        public string? Comment { get; set; }
        public string? Title { get; set; }
        public string? Status { get; set; }
        public Guid? TutorScheduleStatus { get; set; }
        public Guid? StudentScheduleStatus { get; set; }
        public Guid? OperationScheduleStatus { get; set; }
        public bool? IsTutorPresent { get; set; }
        public bool? IsStudentPresent { get; set; }
        public string? MeetingLink { get; set; }
        public DateTime? ClassReminderSentDate { get; set; }
    }
}
