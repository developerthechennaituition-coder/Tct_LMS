using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.Domain.Entities;

public class ChatMessages
{
    public long Id { get; set; }
    public long ChatId { get; set; }
    public Guid UserId { get; set; }
    public string Message { get; set; }
    public DateTime Timestamp { get; set; }
}
