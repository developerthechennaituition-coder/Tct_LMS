using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Address;

namespace TCT.LMS.DTOs.ChatApp
{
    public class TCTChatUser
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string Nickname { get; set; }
        public string? Theme { get; set; }
        public string? ChatTheme { get; set; }
        public string Date { get; set; }
        public dynamic Active { get; set; }
        public bool? Unread { get; set; }
        public bool? Archive { get; set; }
        public bool? Fav { get; set; }
        public bool? Delivered { get; set; }
        public List<ChatConversation> Convo { get; set; }
        public bool? Group { get; set; }
        public byte[]? FileData { get; set; }
        public List<UserDTO> User { get; set; } = new List<UserDTO>();
        public bool IsActive { get; set; } = true;
        public string? Description { get; set; }
        public string? GroupName { get; set; }
    }
}
