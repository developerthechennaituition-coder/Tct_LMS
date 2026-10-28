using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.Domain.Entities;

public class NotificationDetails : BaseEntity
{
    public Guid Id { get; set; }
    public bool IsRead { get; set; }
    public Guid NotificationId { get; set; }
    public Guid FromUserId { get; set; }
    public Guid ToUserId { get; set; }
}
