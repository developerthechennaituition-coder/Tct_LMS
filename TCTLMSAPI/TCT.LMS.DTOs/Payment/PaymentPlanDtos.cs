using System;
using System.Collections.Generic;

namespace TCT.LMS.DTOs.Payment
{
    // Create (or replace) the prepaid plan for one subject enrollment.
    public class CreatePaymentPlanRequest
    {
        public Guid SalesDetailsId { get; set; }
        public Guid StudentId { get; set; }
        public int PlanMonths { get; set; }      // 3 / 6 / 12
        public int StartMonth { get; set; }       // 1-12
        public int StartYear { get; set; }
        public int? TotalClasses { get; set; }    // null = derive from schedule
        public decimal TotalFee { get; set; }
        public int InstallmentCount { get; set; } = 1;
        public Guid UserId { get; set; }          // CreatedBy / ModifiedBy
    }

    // Record one receipt against a plan.
    public class RecordPaymentRequest
    {
        public Guid StudentPaymentPlanId { get; set; }
        public int? InstallmentNo { get; set; }
        public decimal Amount { get; set; }
        public DateTime PaidDate { get; set; }
        public string? PaymentMode { get; set; }
        public string? ReferenceNo { get; set; }
        public string? Notes { get; set; }
        public Guid UserId { get; set; }
    }

    public class PaymentDto
    {
        public Guid Id { get; set; }
        public int? InstallmentNo { get; set; }
        public decimal Amount { get; set; }
        public DateTime PaidDate { get; set; }
        public string? PaymentMode { get; set; }
        public string? ReferenceNo { get; set; }
        public string? Notes { get; set; }
    }

    // One subject whose prepaid credit was exhausted with classes still scheduled (Scenario 3).
    // Returned by overrun detection so the caller can notify roles.
    public class OverrunResultDto
    {
        public Guid SalesDetailsId { get; set; }
        public Guid SalesId { get; set; }
        public Guid StudentId { get; set; }
        public Guid StudentUserId { get; set; }
        public string? StudentName { get; set; }
        public string? Subject { get; set; }
        public string TopUpInvoiceNumber { get; set; }
        public decimal TopUpAmount { get; set; }
        public int RemainingClasses { get; set; }
    }

    // Plan + running payment totals, for the accounts screen and for validation.
    public class PaymentPlanSummaryDto
    {
        public decimal ExtraClassCharges { get; set; }
        public int CompletedClasses { get; set; }
        public int RemainingClasses { get; set; }
        public Guid Id { get; set; }
        public Guid SalesDetailsId { get; set; }
        public Guid StudentId { get; set; }
        public string? Subject { get; set; }
        public int PlanMonths { get; set; }
        public int StartMonth { get; set; }
        public int StartYear { get; set; }
        public int? TotalClasses { get; set; }
        public decimal TotalFee { get; set; }
        public int InstallmentCount { get; set; }
        public decimal AmountPaid { get; set; }
        public decimal RemainingAmount { get; set; }
        public string? UpfrontInvoiceNumber { get; set; }
        public bool IsLocked { get; set; }

        // Scenario-3 block state.
        public bool IsBlocked { get; set; }
        public DateTime? BlockedDate { get; set; }
        public string? BalanceInvoiceNumber { get; set; }

        public List<PaymentDto> Payments { get; set; } = new();
    }
}
