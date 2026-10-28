using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.Schedule
{
    public class ClassStatusSummaryResponseDto
    {
        public int TotalCount { get; set; }
        public List<ScheduleStatusCountDto> StatusSummary { get; set; }
    }
    public class ClassStatusSummaryDto
    {
        public Guid? StatusId { get; set; }
        public string StatusName { get; set; }
        public int Count { get; set; }
        public int Value { get; set; }
    }

    public class ClassScheduleLegendDto
    {
        public Guid ScheduleDetailsId { get; set; }
        public Guid ScheduleId { get; set; }
        public Guid SalesId { get; set; }
        public Guid SalesDetailsId { get; set; }

        public string StudentName { get; set; }
        public string TutorName { get; set; }
        public string SubjectName { get; set; }

        public DateTime Date { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }

        public string Status { get; set; }
        public string ScheduleType { get; set; }
        public string MeetingLink { get; set; }
        public string Comment { get; set; }
    }
}
