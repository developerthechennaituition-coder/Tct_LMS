namespace TCT.LMS.DTOs.User;

public class MenuResponseDto
{
    public int Id { get; set; }
    public int ParentMenuId { get; set; }
    public bool IsMenu { get; set; }
    public bool IsParentMenu { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool Add { get; set; }
    public bool View { get; set; }
    public bool Edit { get; set; }
    public bool Delete { get; set; }
    public bool Report { get; set; }
}
