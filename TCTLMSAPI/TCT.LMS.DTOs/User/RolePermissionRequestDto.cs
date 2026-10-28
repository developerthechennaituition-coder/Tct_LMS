namespace TCT.LMS.DTOs.User;

public class RolePermissionRequestDto
{
    public Guid UserId { get; set; }
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool Add { get; set; }
    public bool View { get; set; }
    public bool Edit { get; set; }
    public bool Delete { get; set; }
}
