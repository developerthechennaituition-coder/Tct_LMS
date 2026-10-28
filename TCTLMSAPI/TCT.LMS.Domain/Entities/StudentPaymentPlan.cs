using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TCT.LMS.Domain.Entities;

// One row per prepaid / long-term subject enrollment (Scenario 1). Absence of an active
// row for a SalesDetails means that enrollment is billed month-by-month (Scenario 2).
public class StudentPaymentPlan : BaseEntity
{
    [Key]
    public Guid Id { get; set; }

    [ForeignKey("SalesDetailsId")]
    public Guid SalesDetailsId { get; set; }
    public Guid StudentId { get; set; }

    public int PlanMonths { get; set; }      // 3 / 6 / 12
    public int StartMonth { get; set; }       // 1-12, first billed month
    public int StartYear { get; set; }
    public int? TotalClasses { get; set; }    // snapshot; null = derive from schedule
    public decimal TotalFee { get; set; }
    public int InstallmentCount { get; set; } // 1 = single shot; 2/3/4 = installments

    // Set when completed-class value reaches the paid credit with classes still remaining.
    // While true, this subject's remaining classes are blocked in every calendar until the
    // balance (top-up) invoice is paid. Cleared automatically when that payment is recorded.
    public bool IsBlocked { get; set; }
    public DateTime? BlockedDate { get; set; }
    public string? BalanceInvoiceNumber { get; set; }

    // The one upfront full-period invoice raised for this plan at admin approval.
    // Set once; used to avoid raising a duplicate and to link back to the invoice.
    public string? UpfrontInvoiceNumber { get; set; }

    public virtual ICollection<StudentPayment> Payments { get; set; }
}
