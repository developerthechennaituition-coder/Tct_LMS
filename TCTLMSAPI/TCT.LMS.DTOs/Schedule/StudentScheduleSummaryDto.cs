using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.Schedule
{
    public class StudentScheduleSubjectSummaryDto
    {
        [Key]
        public Guid SalesDetailsId { get; set; }
        public string? SubjectName { get; set; }
        public int? CurrentMonthScheduledClasses { get; set; }
        public int? CurrentMonthCompletedClasses { get; set; }
        public int? CurrentMonthUpcomingClasses { get; set; }
        public int? TotalScheduledClasses { get; set; }
        public int? CompletedClasses { get; set; }
        public int? UpcomingClasses { get; set; }
        public int? StudentAttendanceCount { get; set; }
        public decimal? StudentAttendancePercentage { get; set; }
        public int? CancelledClassesByStudent { get; set; }
        public decimal? CancelledByStudentPercentage { get; set; }
        public DateTime? FirstScheduleDate { get; set; }
        public DateTime? LastScheduleDate { get; set; }
        public decimal? CompletionPercentage { get; set; }
    }

    public class StudentScheduleOverallSummaryDto
    {
        public int? ScheduledClassesForCurrentMonth { get; set; }
        public int? CompletedClassesForCurrentMonth { get; set; }
        public int? UpcomingClassesForCurrentMonth { get; set; }
        public int? TotalClassesScheduled { get; set; }
        public int? TotalCompletedClasses { get; set; }
        public int? TotalUpcomingClasses { get; set; }
        public int? TotalStudentAttendanceCount { get; set; }
        public decimal? OverallStudentAttendancePercentage { get; set; }
        public int? TotalCancelledClassesByStudent { get; set; }
        public decimal? OverrallCancelledByStudentPercentage { get; set; }
        public decimal? OverallCompletionPercentage { get; set; }
    }

    public class StudentScheduleSummaryResponseDto
    {
        public List<StudentScheduleSubjectSummaryDto>? SubjectSummaries { get; set; }
        public StudentScheduleOverallSummaryDto? OverallSummary { get; set; }
        public bool ShowLearningExperienceFeedback { get; set; }
    }
}
