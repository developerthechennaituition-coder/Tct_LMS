using System.ComponentModel.DataAnnotations;

namespace TCT.LMS.Domain.Entities;

public class TutorElectronicAddress : BaseEntity
{
    [Key]
    public Guid? Id { get; set; }
    public Guid? TutorId { get; set; }
    public Guid? UserType { get; set; }
    public string? EmailAddress { get; set; }
    public string? MobileNumber { get; set; }
    public bool? IsPrimary { get; set; }
}
