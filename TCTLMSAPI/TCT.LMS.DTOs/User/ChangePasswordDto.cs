using System.ComponentModel.DataAnnotations;

namespace TCT.LMS.DTOs.User;

public class ChangePasswordDto
{
    public Guid? UserId { get; set; }

    [Required]
    public string Email { get; set; } = string.Empty;

    public string CurrentPassword { get; set; } = null!;

    [Required]
    [DataType(DataType.Password)]
    [StringLength(100, ErrorMessage = "{0} cannot be longer than {1} characters and less than {2} characters.", MinimumLength = 6)]
    public string NewPassword { get; set; } = null!;

    [Required]
    [DataType(DataType.Password)]
    [StringLength(100, ErrorMessage = "{0} cannot be longer than {1} characters and less than {2} characters.", MinimumLength = 6)]
    public string ConfirmPassword { get; set; } = null!;
}
