using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.Schedule
{
    public class ScheduleReportQueryParams
    {
        public Guid? StudentId { get; set; } 
        public Guid? OperationId { get; set; } 
        public DateTime? FromDate { get; set; } 
        public DateTime? ToDate { get; set; } 
        public Guid? OperationStatus { get; set; }
        public Guid? TutorId { get; set; }
    }
}
