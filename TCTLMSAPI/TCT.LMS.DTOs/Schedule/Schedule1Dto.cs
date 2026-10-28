using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.Schedule
{
    public class Schedule1Dto
    {
        public Guid ScheduleId { get; set; }
        public Guid? SalesDetailsId { get; set; }
        public Guid? TutorId { get; set; }
        public Guid? StudentId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string? Title { get; set; }
        public string? Description { get; set; }
        public DateTime? Date { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public string? ScheduleType { get; set; }
        public string? Comment { get; set; }
        public string? Status { get; set; }
        public Guid? ScheduleStatus { get; set; }
        public string RepeatType { get; set; }
        public List<string> WeeklyDays { get; set; }
        public Guid UserId { get; set; }
        public Guid SubjectId { get;set; }
        public string RepeatOn { get; set; }
        public string MeetingLink { get; set; }
        public int? StatusCode { get; set; }
        public string MeetingLine { get; set; }
        public int? NoOfMonths { get; set; }
        public DateTime? ScheduleEndDate { get; set; }
        public string? ScheduleMode { get; set; }
        public int? TotalClasses { get; set; }
    }
}
