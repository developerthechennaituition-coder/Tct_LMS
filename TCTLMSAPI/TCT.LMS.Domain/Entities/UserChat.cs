using System.ComponentModel.DataAnnotations;

namespace TCT.LMS.Domain.Entities;

public class UserChat
{
    [Key]
    public long UserChatId { get; set; }

    // Foreign keys
    public Guid UserId { get; set; }
    public long ChatId { get; set; }

    // Navigation properties
    public User User { get; set; } = null!;
    public Chat Chat { get; set; } = null!;
}
