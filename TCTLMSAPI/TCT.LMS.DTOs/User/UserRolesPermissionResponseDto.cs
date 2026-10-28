using TCT.LMS.Domain.Entities;

namespace TCT.LMS.DTOs.User;

public class UserRolesPermissionResponseDto
{   
    public Guid UserId { get; set; }
    public List<RolesResponseDto>? Roles { get; set; }
    public List<MenuResponseDto>? Permissions { get; set; }
}
