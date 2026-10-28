using System.ComponentModel.DataAnnotations;

namespace TCT.LMS.Domain.Entities;

public class TutorInvoiceDetails : BaseEntity
{
    [Key]
    public long Id { get; set; }
    public long TutorInvoiceId { get; set; }
    public Guid? ScheduleDetailsId { get; set; }
    public Guid? StudentId { get; set; }
    public string StudentName { get; set; }
    public DateTime ScheduleDate { get; set; }
    public decimal SubjectPayment { get; set; }
    
}

