using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.Schedule
{
    public class StudentScheduleDetailsDto
    {
        public string? RepeatType { get; set; }
        public List<string> RepeatOn { get; set; }
        public Guid ScheduleDetailsId { get; set; }
        public Guid ScheduleId { get; set; }
        public DateTime? Date { get; set; }
        public DateTime? StartTime { get; set; }
        public DateTime? EndTime { get; set; }
        public string? ScheduleType { get; set; }
        public string? TutorComment { get; set; }
        public string? StudentComment { get; set; }
        public string? Title { get; set; }
        public string? Description { get; set; }
        public string MeetingLink { get; set; }
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
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int? StatusCode { get; set; }
    }
}
