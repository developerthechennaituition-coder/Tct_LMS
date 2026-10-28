using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.Domain.Entities;
public class Chats
{
    public long Id { get; set; }
    public Guid TutorId { get; set; }
    public Guid StudentId { get; set; }
    public Guid AdminId { get; set; }
    public List<ChatMessages> Messages { get; set; }
}
