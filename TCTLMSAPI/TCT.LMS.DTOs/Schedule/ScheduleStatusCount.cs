using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.Schedule
{
    public class ScheduleStatusCountDto
    {
        public Guid? StatusId { get; set; } 
        public int Value { get; set; } 
        public string StatusName { get; set; } 
        public int Count { get; set; }
    }
}
