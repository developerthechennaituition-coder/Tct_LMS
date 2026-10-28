using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.Domain.Entities
{
    public class MessageStatus
    {
        [Key]
        public Guid Id { get; set; } 
        public Guid MessageId { get; set; } 
        public Guid UserId { get; set; } 
        public bool IsDelivered { get; set; } 
        public bool IsRead { get; set; } 
        public DateTime? DeliveredAt { get; set; } 
        public DateTime? ReadAt { get; set; } 
        public DateTime CreatedAt { get; set; }
    }
}
