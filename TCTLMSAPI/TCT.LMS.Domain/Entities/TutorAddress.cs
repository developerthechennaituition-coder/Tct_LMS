using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TCT.LMS.Domain.Entities;

public class TutorAddress : BaseEntity
{
    [Key]
    public Guid? Id { get; set; }
    [ForeignKey("Tutor")]
    public Guid? TutorId { get; set; }
    public string? Street { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? ZipCode { get; set; }
    public string? Country { get; set; }
    public string UserType { get; set; }
    public bool? IsPrimary { get; set; }
}
