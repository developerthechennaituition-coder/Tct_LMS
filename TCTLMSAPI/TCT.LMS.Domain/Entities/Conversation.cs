using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.Domain.Entities
{
    public class Conversation
    {
        [Key]
        public string ConversationId { get; set; }
        public Guid UserId { get; set; }
        public DateTime ConversationDate { get; set; }
        public DateTime CreatedAt { get; set; }
        public Guid SenderId { get; set; }
        public Guid ReceiverId { get; set; }
        public string? ConvType { get; set; }
        public ICollection<Message> Messages { get; set; }
        public Guid? GroupId { get; set; }
        public bool Delivered { get; set; }
        public bool Unread { get; set; }
    }
}
