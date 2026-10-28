using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TCT.LMS.Domain.Entities;

public class TutorDetails : BaseEntity
{
    [Key]
    public Guid Id { get; set; }
    public Guid TutorId { get; set; }
    public Guid BoardId { get; set; }
    public Guid GradeId { get; set; }
    public Guid SubjectId { get; set; }
    public decimal? TutorPayment { get; set; }
    public Guid? GradeGroupId { get; set; }
}
