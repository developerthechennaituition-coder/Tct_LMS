using System.ComponentModel.DataAnnotations;

namespace TCT.LMS.Domain.Entities;

// Chat "Delete for me": hides one message (Messages.MessageId) from one user's view only.
// The message row and every other participant's view are unchanged.
public class MessageUserDeletion
{
    [Key]
    public Guid Id { get; set; }
    public int MessageId { get; set; }
    public Guid UserId { get; set; }
    public DateTime DeletedAt { get; set; }
}
