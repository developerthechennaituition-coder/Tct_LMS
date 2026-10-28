using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.Domain.Entities;

public class Notification : BaseEntity
{
    public Guid Id { get; set; }
    public Guid? SalesId { get; set; }
    public Guid? SalesDetailsId { get; set; } 
    public int NotificationType { get; set; }
    public string? Message { get; set; }
    public Guid? ScheduleDetailsId { get; set; }
}
