using Microsoft.VisualBasic;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.Domain.Entities
{
    public class ChatUser
    {
        [Key]
        public Guid UserId { get; set; }
        public string Name { get; set; }
        public string Nickname { get; set; }
        public string Theme { get; set; }
        public string ChatTheme { get; set; }
        public bool IsFavorite { get; set; }
        public string LastActiveStatus { get; set; }
        public DateTime LastActiveDate { get; set; }
        public bool UnreadMessages { get; set; }
        public bool IsArchived { get; set; }
        public bool IsDelivered { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        // Navigation properties
        //public ICollection<Conversation> Conversations { get; set; }
    }
}
