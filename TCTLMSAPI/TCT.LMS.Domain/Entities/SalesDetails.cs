using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TCT.LMS.Domain.Entities;

public class SalesDetails : BaseEntity
{
    [Key]
    public Guid Id { get; set; }
    [ForeignKey("SalesId")]
    public Guid SalesId { get; set; }
    public Guid Coordinator { get; set; }
    public Guid SubjectId { get; set; }
    public Guid Status { get; set; }
    public decimal ParentPayment { get; set; }
    public Guid? TutorId { get; set; }
    public decimal TutorPayment { get; set; }
    public string? NoOfSessionPerWeek { get; set; }
    public string? SubjectCode { get; set; }
    public string? AuthorBookDetails { get; set; }
    public DateTime? FollowUpDate { get; set; }
    public Guid? StudentRiskStatus { get; set; }
    public DateTime? ClassActualDate { get; set; }
    // Preferred Demo Date requested at enrollment (not a booking; the actual demo date is the schedule's date).
    public DateTime? DemoDate { get; set; }
    // Demo Type: true = Paid Demo, false = Free Demo, null = not specified (enrolled before this field existed).
    public bool? IsPaidDemo { get; set; }
}