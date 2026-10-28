using System.ComponentModel.DataAnnotations;

namespace TCT.LMS.Domain.Entities;

public sealed class Roles : BaseEntity
{
    [Key]
    public int? Id { get; set; }
    public string? RoleName { get; set; }
}
