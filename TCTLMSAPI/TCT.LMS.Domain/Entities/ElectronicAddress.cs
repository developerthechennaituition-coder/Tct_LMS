using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TCT.LMS.Domain.Entities;

public class ElectronicAddress : BaseEntity
{
    [Key]
    public Guid? Id { get; set; }
    [ForeignKey("User")]
    public Guid? UserId { get; set; }
    public string? EmailAddress { get; set; }
    public string? MobileNumber { get; set; }
    public bool? IsPrimary { get; set; }
}
