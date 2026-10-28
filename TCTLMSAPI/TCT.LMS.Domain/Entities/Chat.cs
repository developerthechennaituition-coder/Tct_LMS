using System.ComponentModel.DataAnnotations;

namespace TCT.LMS.Domain.Entities;

public class Chat
{
    [Key]
    public long ChatId { get; set; }
    public string ChatName { get; set; } = string.Empty;

    // Navigation property
    public ICollection<UserChat> UserChats { get; set; } = new List<UserChat>();
    public ICollection<Message> Messages { get; set; } = new List<Message>();
}
