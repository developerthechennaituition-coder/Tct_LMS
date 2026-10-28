using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.Invoice
{
    public class StudentInvoiceViewModel
    {
        [Key]
        public string? InvoiceNumber { get; set; }
        public long? InvoiceDetailId { get; set; }
        public decimal? TotalInvoiceAmount { get; set; }
        public int? Month { get; set; }
        public int? Year { get; set; }
        public string? StudentName { get; set; }
        public string? ParentName { get; set; }
        public string? ParentEmail { get; set; }
        public string? TutorName { get; set; }
        public string? Grade { get; set; }
        public string? Board { get; set; }
        public string? Subject { get; set; }
        public decimal? ParentPayment { get; set; }
        public int? NumberOfClasses { get; set; }
        public int? PreviousMonthTotalClasses { get; set; }
        public int? PreviousMonthPendingClasses { get; set; }
        public string? PreviousMonthPendingClassesMonthYear { get; set; }
        public string? ScheduleType { get; set; }
        public decimal? SubjectAmount { get; set; }   // this subject's billed amount
        public DateTime? StartDate { get; set; }
        public DateTime? DueDate { get; set; }

        // Bank Details fields
        public string? AccountName { get; set; }
        public string? AccountNumber { get; set; }
        public string? AccountType { get; set; }
        public string? IFSCCode { get; set; }
        public string? BankName { get; set; }
        public string? BranchName { get; set; }
        public string? UpiID { get; set; }
        public string? SwiftCode { get; set; }
        public string? IBANNumber { get; set; }

        // TCT Details fields
        public string? Title { get; set; }
        public string? Address1 { get; set; }
        public string? Address2 { get; set; }
        public string? City { get; set; }
        public string? Zip { get; set; }
        public string? State { get; set; }
        public string? Country { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? GSTIN { get; set; }
        public string? PAN { get; set; }
        public string? HSNCode { get; set; }
        public string? Location { get; set; }
        public string? AmountInWords { get; set; }
        public string? MonthName { get; set; }
        public string? PaymentUrl { get; set; }

        // Prepaid plan (Scenario 1). IsPrepaid=false => monthly billing (Scenario 2),
        // and the plan fields stay null. Computed live at render from StudentPaymentPlan/StudentPayment.
        public Guid? SalesDetailsId { get; set; }
        public bool IsPrepaid { get; set; }
        public int? PlanTotalClasses { get; set; }        // total classes across the whole plan
        public int? PlanClassesScheduledSoFar { get; set; } // classes through the invoiced month
        public decimal? PlanTotalFee { get; set; }
        public decimal? PlanAmountPaid { get; set; }
        // This month's outcome after consuming the paid balance in date order.
        public decimal? PlanAmountDueThisMonth { get; set; } // 0 when the prepaid balance still covers this month
        public bool PlanMonthCovered { get; set; }            // true => PAID (₹0 due) this month

        // Invoice classification (prepaid v2). "Statement"/"Upfront"/"TopUp"/null(=Regular).
        public string? InvoiceType { get; set; }

        // Monthly statement figures (only meaningful when InvoiceType == "Statement").
        // Computed live at render from the schedule + plan for this subject/month.
        public int? StmtThisMonthScheduled { get; set; }  // classes scheduled in the statement month
        public int? StmtPrevMonthCancelled { get; set; }  // classes cancelled in the previous month
        public int? StmtTotalCompleted { get; set; }      // completed classes across the plan, through this month
        public int? StmtTotalPending { get; set; }        // plan total classes − completed
        public decimal? StmtAmountPaid { get; set; }      // total paid into the plan
        public decimal? StmtPendingAmount { get; set; }   // max(0, completed-value − paid); >0 means overrun
    }
}
