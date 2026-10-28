using System.ComponentModel.DataAnnotations;

namespace TCT.LMS.DTOs.User;

public class UserActivityResponseDTO
{
    public Guid UserId { get; set; }
    public string UserName { get; set; }
    public DateTime LoggedIn { get; set; }
    public DateTime? LoggedOut { get; set; }
}