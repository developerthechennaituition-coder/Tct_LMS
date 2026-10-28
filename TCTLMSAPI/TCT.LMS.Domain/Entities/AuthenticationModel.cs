using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.Domain.Entities;

public class AuthenticationModel
{
    public Guid UserId { get; set; }
    public string UserName { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Token { get; set; } = null!;
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiresAt { get; set; }
    public List<Menu> Permissions { get; set; } = null!;
    public List<string> UserRoles { get; set; } = null!;
    public string Message { get; set; } = null!;
    public string Role { get; set; } = null!;
    public string RoleId { get; set; }
    public string? Nationality { get; set; }
    public bool IsFeedbackCheckRequired { get; set; }
    public bool IsFeedbackSubmitedToday { get; set; }

    public bool RequiresStudentSelection { get; set; }
    public string LoginEmail { get; set; }
    public List<StudentSelectionDto> Students { get; set; } = new();
}
