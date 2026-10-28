using System.ComponentModel.DataAnnotations;

namespace TCT.LMS.Domain.Entities;

public class StudentInvoiceDetails : BaseEntity
{
    [Key]
    public long? Id { get; set; }
    public long StudentInvoiceId { get; set; }
    public Guid UserId { get; set; }
    public Guid ScheduleId { get; set; }
    public Guid StudentId { get; set; }
    public string StudentName { get; set; }
    public string ParentName { get; set; }
    public Guid TutorId { get; set; }
    public string TutorName { get; set; }
    public string Grade { get; set; }
    public string Board { get; set; }
    public string Subject { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal ParentPayment { get; set; }
    public int NumberOfClasses { get; set; }
    public int? PreviousMonthTotalClasses { get; set; }
    public int? PreviousMonthPendingClasses { get; set; }
    public string PreviousMonthPendingClassesMonthYear { get; set; }
    public string ScheduleType { get; set; }
    public decimal? SubjectAmount { get; set; }   // this subject's billed amount on the invoice

    public virtual StudentInvoice StudentInvoice { get; set; }
}
