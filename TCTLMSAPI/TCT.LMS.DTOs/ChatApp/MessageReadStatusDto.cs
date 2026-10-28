using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.ChatApp
{
    public class MessageReadStatusDto
    {
        public Guid MessageId { get; set; }
        public Guid SenderId { get; set; }
        public Guid UserId { get; set; }
        public DateTime? ReadAt { get; set; }
    }
}
