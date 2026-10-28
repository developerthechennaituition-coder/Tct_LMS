using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TCT.LMS.Domain.Entities;

// Immutable ledger: a completed extra class may appear on only one invoice.
[Table("PrepaidClassCharge")]
public class PrepaidClassCharge
{
    [Key] public Guid Id { get; set; }
    public Guid StudentPaymentPlanId { get; set; }
    public Guid ScheduleDetailsId { get; set; }
    public long StudentInvoiceId { get; set; }
    [Column(TypeName = "decimal(18,2)")] public decimal Amount { get; set; }
    public DateTime CreatedDate { get; set; }
}
