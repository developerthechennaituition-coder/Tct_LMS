using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.Schedule
{
    public class ScheduleChangeRqstDTO
    {
        public Guid? EventStatus { get; set; }
        public string? GuestType { get; set; }
        public Guid SalesId { get; set; }
        public Guid SalesDetailsId { get; set; }
        public int EventType { get; set; }
        public Guid ScheduleDetailsId { get; set; }
        public Guid UserId { get; set; }
        public string? UserRole { get; set; }

    }
}
