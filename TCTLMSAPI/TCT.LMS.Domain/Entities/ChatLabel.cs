using System.ComponentModel.DataAnnotations;

namespace TCT.LMS.Domain.Entities;

public class ChatLabel
{
    [Key]
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public Guid CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? ModifiedDate { get; set; }

    public bool IsActive { get; set; }

    public ICollection<ChatLabelMember> Members { get; set; } = new List<ChatLabelMember>();
}