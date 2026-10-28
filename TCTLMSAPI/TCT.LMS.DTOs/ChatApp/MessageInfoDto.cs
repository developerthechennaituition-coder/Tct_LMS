using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.ChatApp
{
    public class MessageInfoDto
    {
        public Guid MessageId { get; set; } 
        public List<MessageUserStatusDto> ReadBy { get; set; } = new(); 
        public List<MessageUserStatusDto> DeliveredTo { get; set; } = new(); 
        public List<MessageUserStatusDto> Remaining { get; set; } = new();
    }
    public class MessageUserStatusDto
    {
        public Guid UserId { get; set; } 
        public string Name { get; set; } 
        public string Nickname { get; set; } 
        public string Theme { get; set; } 
        public DateTime? DeliveredAt { get; set; } 
        public DateTime? ReadAt { get; set; }
    }
}
