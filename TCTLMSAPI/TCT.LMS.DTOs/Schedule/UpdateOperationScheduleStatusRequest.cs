using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.Schedule;

public class UpdateOperationScheduleStatusRequest
{
    public Guid ScheduleDetailsId { get; set; }
    public Guid OperationScheduleStatus { get; set; }
}