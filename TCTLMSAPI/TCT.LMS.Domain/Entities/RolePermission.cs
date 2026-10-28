using System.ComponentModel.DataAnnotations;

namespace TCT.LMS.Domain.Entities;

public sealed class RolePermission : BaseEntity
{
    [Key]
    public Guid Id { get; set; }
    public int RoleId { get; set; }
    public int PermissionId { get; set; }

    public Permissions Permissions { get; set; }    
}
