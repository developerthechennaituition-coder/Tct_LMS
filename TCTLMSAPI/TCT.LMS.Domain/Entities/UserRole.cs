using System.ComponentModel.DataAnnotations;

namespace TCT.LMS.Domain.Entities;

public sealed class UserRole : BaseEntity
{
    [Key]
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public int RoleId { get; set; }
}
