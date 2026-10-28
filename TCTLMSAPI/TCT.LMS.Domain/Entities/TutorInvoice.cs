using System.ComponentModel.DataAnnotations;

namespace TCT.LMS.Domain.Entities;

public class TutorInvoice : BaseEntity
{
    [Key]
    public long Id { get; set; }
    public string? InvoiceNumber { get; set; }
    public Guid TutorId { get; set; }
    public Guid ScheduleId { get; set; }
    public string Month { get; set; }
    public int Year { get; set; }
    public decimal TutorTotalPayment { get; set; }
    public DateTime? EmailSentDate { get; set; }
}