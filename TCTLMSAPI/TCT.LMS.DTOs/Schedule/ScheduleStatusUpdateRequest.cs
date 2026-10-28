using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.Schedule;

public class ScheduleStatusUpdateRequest
{
    public int ActionCode { get; set; }  // "1014001" | "1014002" | "1014004"
    public Guid StudentId { get; set; }
    public Guid UserId { get; set; }
    public List<Guid> ScheduleIds { get; set; }
}
