using System.ComponentModel.DataAnnotations;

namespace TCT.LMS.Domain.Entities;

public class Student : BaseEntity
{
    [Key]
    public Guid Id { get; set; }
    public string? Code { get; set; }
    public string? ParentName { get; set; }    
    public Guid? UserId { get; set; }
    public Guid BoardId { get; set; }
    public Guid GradeId { get; set; }
    public Guid StudentRiskStatus { get; set; }
}
