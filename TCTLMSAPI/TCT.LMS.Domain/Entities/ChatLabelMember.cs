using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace TCT.LMS.Domain.Entities;

public class ChatLabelMember
{
    [Key]
    public Guid Id { get; set; }

    public Guid LabelId { get; set; }

    public Guid? UserId { get; set; }

    public Guid? GroupId { get; set; }

    public DateTime CreatedDate { get; set; }

    public bool IsActive { get; set; }

    [ForeignKey(nameof(LabelId))]
    [JsonIgnore]
    public ChatLabel? Label { get; set; }
}