using System;
using System.Collections.Generic;
using System.IO.Enumeration;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.DTOs.Address;

namespace TCT.LMS.DTOs.ChatApp
{
    public class ChatConversation
    {
        public string Id { get; set; }
        public List<string> Chat { get; set; }
        public List<ChatMessage1> Chat1 { get; set; }
        public bool Me { get; set; }
        public string Date { get; set; }
        public UserDTO User { get; set; }
    }

    public class ChatMessage1
    {
        public int MessageId { get; set; }
        public string ConversationId { get; set; }
        public string MessageText { get; set; }
        public bool IsFromMe { get; set; }
        public DateTime MessageDate { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool IsDeleted { get; set; }
        public Guid Id { get; set; }
        public List<FileData>? FileDatas { get; set; }
        public bool? IsRead { get; set; }
        public bool? IsDelivered { get; set; } 
        public DateTime? ReadAt { get; set; }
        public DateTime? DeliveredAt { get; set; }
        public Guid? ScheduleDetailsId { get; set; }
    }
    public class FileData
    {
        public byte[] Data { get; set; }
        public string FileName { get; set; }
        public string ContentType { get; set; }
    }
}
