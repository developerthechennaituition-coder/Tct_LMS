using System.ComponentModel.DataAnnotations;

namespace TCT.LMS.Domain.Entities;

// One row per cancelled class (unique ScheduleDetailsId), so editing, retrying or re-saving a status never counts
// a class twice. Category "tutor" (the tutor set Class Cancelled) counts against the tutor's monthly allowance and is
// deducted at the month's payroll when no make-up was approved by the end of that month; "student" rows are kept
// only so a make-up can be attributed on the Operations dashboard. See TutorCancellationRules.
public class TutorCancellationTracking
{
    [Key]
    public Guid Id { get; set; }
    public Guid ScheduleDetailsId { get; set; }
    public Guid SalesDetailsId { get; set; }
    public Guid TutorId { get; set; }                      // Tutor.Id: the allowance is per tutor, across all courses
    public string Category { get; set; } = null!;          // "tutor" or "student"
    public bool CountsAgainstAllowance { get; set; }
    public DateTime ClassDate { get; set; }                // the cancelled class's date (IST), decides the month
    public Guid CancelledBy { get; set; }
    public DateTime CancelledAt { get; set; }              // IST
    // False when the class's status was changed away from Class Cancelled before a make-up or deduction.
    public bool IsActive { get; set; }
    public Guid? MakeupRequestId { get; set; }             // ScheduleChangeRequest of kind CancelledClassMakeup
    public Guid? MakeupScheduleDetailsId { get; set; }     // the approved make-up class (unique)
    public string? RescheduledByType { get; set; }         // who asked for the make-up: "tutor" or "student"
    public DateTime? RescheduledAt { get; set; }           // IST, when Operations approved the make-up
    public decimal? DeductionAmount { get; set; }
    public long? DeductionInvoiceId { get; set; }          // TutorInvoice the deduction was applied to (once)
    public DateTime? DeductedAt { get; set; }
    public DateTime? TutorNotifiedAt { get; set; }
    public DateTime? ModifiedDate { get; set; }
}
