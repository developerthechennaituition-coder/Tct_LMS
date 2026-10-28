using System.ComponentModel.DataAnnotations;

namespace TCT.LMS.DTOs.User;

public record LoginRequestDto
{
    [Required]
    public string? UserName { get; set; }
    [Required]
    public string? Password { get; set; }
}
