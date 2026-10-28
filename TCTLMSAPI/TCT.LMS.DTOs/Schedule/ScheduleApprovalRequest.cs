using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.Schedule;

public class ScheduleApprovalRequest
{
    public List<Guid> ScheduleIds { get; set; }
    public Guid? UserId {get;set;}
    public bool IsApprovedMethod { get;set; }

}