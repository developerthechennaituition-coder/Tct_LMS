using System.ComponentModel.DataAnnotations;
using System.Net.Mail;

namespace TCT.LMS.Domain.Entities
{
    public class Message
    {
        [Key]
        public int MessageId { get; set; }
        public Guid Id { get; set; }
        public string ConversationId { get; set; }
        public string? MessageText { get; set; }
        public bool IsFromMe { get; set; }
        public bool IsDeleted { get; set; }
        public DateTime? ModifiedDate { get; set; }
        public DateTime MessageDate { get; set; }
        public DateTime CreatedAt { get; set; }
        public Guid? ScheduleDetailsId { get; set; }
        // Navigation property
        public Conversation Conversation { get; set; }
    }
}