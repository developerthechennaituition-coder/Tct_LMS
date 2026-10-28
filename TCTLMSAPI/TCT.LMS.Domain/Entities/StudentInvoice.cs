using System.ComponentModel.DataAnnotations;

namespace TCT.LMS.Domain.Entities;

public class StudentInvoice : BaseEntity
{
    [Key]
    public long Id { get; set; }
    public string InvoiceNumber { get; set; }
    public Guid StudentId { get; set; }
    public Guid ScheduleId { get; set; }
    public decimal TotalInvoiceAmount { get; set; }
    public int Month { get; set; }
    public int Year { get; set; }
    public DateTime? EmailSentDate { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? DueDate { get; set; }
    public string? PaymentUrl { get; set; }

    // Prepaid v2: null/"Regular" = normal monthly charge, "Upfront" = full-term prepaid invoice,
    // "Statement" = informational monthly consumption statement, "TopUp" = Scenario-3 balance invoice.
    public string? InvoiceType { get; set; }

    public virtual ICollection<StudentInvoiceDetails> InvoiceDetails { get; set; }
}
