using TCT.LMS.Domain.Entities;

namespace TCT.LMS.DTOs.User;

public class AuthenticationResponseDto
{
    public bool IsSuccess { get; set; }
    public string Message { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public DateTime? RefreshTokenExpiresAt { get; set; }
    public string Role { get; set; } = string.Empty;
    public string RoleId { get; set; } = string.Empty;
    public string? Nationality { get; set; }
    public bool IsFeedbackCheckRequired { get; set; }
    public bool IsFeedbackSubmitedToday { get; set; }
    public bool RequiresStudentSelection { get; set; }
    public string LoginEmail { get; set; } = string.Empty;
    public List<StudentSelectionDto> Students { get; set; } = new();

    public static AuthenticationResponseDto From(AuthenticationModel model) => new()
    {
        IsSuccess = !string.IsNullOrEmpty(model.Token),
        Message = model.Message ?? string.Empty,
        UserId = model.UserId,
        UserName = model.UserName ?? string.Empty,
        Email = model.Email ?? string.Empty,
        Token = model.Token ?? string.Empty,
        RefreshTokenExpiresAt = model.RefreshTokenExpiresAt,
        Role = model.Role ?? string.Empty,
        RoleId = model.RoleId ?? string.Empty,
        Nationality = model.Nationality,
        IsFeedbackCheckRequired = model.IsFeedbackCheckRequired,
        IsFeedbackSubmitedToday = model.IsFeedbackSubmitedToday,
        RequiresStudentSelection = model.RequiresStudentSelection,
        LoginEmail = model.LoginEmail ?? string.Empty,
        Students = model.Students ?? new()
    };
}
