using System.ComponentModel.DataAnnotations;

namespace TCT.LMS.Domain.Entities;

public sealed class Permissions : BaseEntity
{
    [Key]
    public int Id { get; set; }
    public string? PermissionName { get; set; }
}
