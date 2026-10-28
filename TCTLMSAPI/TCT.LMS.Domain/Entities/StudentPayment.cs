using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TCT.LMS.Domain.Entities;

// A single receipt against a StudentPaymentPlan. Single-shot = one row; installments = 2/3/4 rows.
public class StudentPayment : BaseEntity
{
    [Key]
    public Guid Id { get; set; }

    [ForeignKey("StudentPaymentPlan")]
    public Guid StudentPaymentPlanId { get; set; }

    public int? InstallmentNo { get; set; }   // 1..InstallmentCount; null for ad-hoc
    public decimal Amount { get; set; }
    public DateTime PaidDate { get; set; }
    public string? PaymentMode { get; set; }  // Cash / UPI / Bank / Stripe
    public string? ReferenceNo { get; set; }
    public string? Notes { get; set; }

    public virtual StudentPaymentPlan StudentPaymentPlan { get; set; }
}
