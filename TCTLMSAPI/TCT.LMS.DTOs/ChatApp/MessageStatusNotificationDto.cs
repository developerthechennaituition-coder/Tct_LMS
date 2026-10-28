using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.ChatApp
{
    public class MessageStatusNotificationDto
    {
        public Guid MessageId { get; set; }
        public Guid SenderId { get; set; }
        public Guid UserId { get; set; }
        public DateTime? DeliveredAt { get; set; }
        public DateTime? ReadAt { get; set; }
        public Guid GroupId { get; set; }
        public string GroupName { get; set; }
    }
}
