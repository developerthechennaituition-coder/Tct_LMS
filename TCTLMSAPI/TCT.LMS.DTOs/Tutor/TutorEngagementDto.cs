using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.Tutor
{
    public class TutorEngagementDto
    {
        public string FullName { get; set; }
        public Guid TutorId { get; set; }
        public string MonthYear { get; set; } // Format: yyyy-MM
        public int SessionCount { get; set; }
        public bool IsCurrentMonth { get; set; }
        public string EngagementLevel { get; set; }
        public int CompletedSessions { get; set; }
        public int CancelledSessions { get; set; }
        public int RescheduledSessions { get; set; }
        public int RemainingSessions { get; set; }
    }

    public class TutorDashboardInfoDto
    {
        public int OverallDropoutStudents { get; set; }
        public int TutorTotalClasses { get; set; }
        public int TutorTotalCancelledClasses { get; set; }
        public int TotalDropoutStudents { get; set; }
        public int TotalActiveStudents { get; set; }
        public int TotalAllocatedByTCT { get; set; }
        public EngagementRatio Engagement { get; set; }
        public RatingSummary RatingSummary { get; set; }
    }

    public class RatingSummary
    {
        public Guid RatedUserId { get; set; }
        public int TotalRatings { get; set; }
        public double AverageRating { get; set; }
    }

    public class EngagementRatio
    {
        public string EngagementStatus { get; set; }
        public double TotalAvailableHours { get; set; }
        public double TotalOccupiedHours { get; set; }
        public double EngagementRatePercent { get; set; }
    }

}
