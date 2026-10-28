using System.ComponentModel.DataAnnotations;

namespace TCT.LMS.Domain.Entities;

public class Tutor : BaseEntity
{
    [Key]
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
}
