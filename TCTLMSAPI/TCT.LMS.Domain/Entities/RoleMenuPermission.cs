namespace TCT.LMS.Domain.Entities;

public class RoleMenuPermission : BaseEntity
{
    public int Id { get; set; }
    public int RoleId { get; set; }
    public int MenuId { get; set; }
    public bool View { get; set; }
    public bool Add { get; set; }
    public bool Edit { get; set; }
    public bool Delete { get; set; }
    public bool? Report { get; set; }
    public bool? MapBank { get; set; }
}
