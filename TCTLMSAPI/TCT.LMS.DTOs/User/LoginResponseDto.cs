using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.User;

public record LoginResponseDto
{
    public Guid UserId { get; set; }
    public string? Token { get; set; }
    public string? UserFirstName { get; set; }
    public string? UserLastName { get; set; }
    public Guid UserRole { get; set; }
    public string? UserName { get; set; }
    public string? MobileNumber { get; set; }
    public string? UserEmail { get; set; }
    public IEnumerable<object> RolePermission { get; set; } = new List<object>();
}
