using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.Schedule;

public class AccountsInvoiceSummaryDto
{
    // Enriched after the monthly SQL summary; not columns in that SQL result.
    [System.ComponentModel.DataAnnotations.Schema.NotMapped] public int? ScheduledPackageMonths { get; set; }
    [System.ComponentModel.DataAnnotations.Schema.NotMapped] public int? PackageStartMonth { get; set; }
    [System.ComponentModel.DataAnnotations.Schema.NotMapped] public int? PackageStartYear { get; set; }
    [System.ComponentModel.DataAnnotations.Schema.NotMapped] public Guid? PaymentPlanId { get; set; }
    [System.ComponentModel.DataAnnotations.Schema.NotMapped] public int? PaymentPlanMonths { get; set; }
    [System.ComponentModel.DataAnnotations.Schema.NotMapped] public string? PackageInvoiceNumber { get; set; }
    [System.ComponentModel.DataAnnotations.Schema.NotMapped] public decimal? PackageTotalFee { get; set; }
    [System.ComponentModel.DataAnnotations.Schema.NotMapped] public int? PackageTotalClasses { get; set; }
    public Guid StudentId { get; set; }
    public Guid UserId { get; set; }
    public Guid SalesDetailsId { get; set; }
    public string StudentName { get; set; }
    public string TutorName { get; set; }
    public string ParentName { get; set; }
    public string Grade { get; set; }
    public string Board { get; set; }
    public string Subject { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public string MonthName { get; set; }
    public decimal ParentPayment { get; set; }
    public int NumberOfClasses { get; set; }
    public decimal TotalHours { get; set; }
    public decimal TotalParentPayment { get; set; }
    public string ScheduleType { get; set; }
    public string? InvoiceNumber { get; set; }
    public decimal TotalInvoiceAmount { get; set; }
    public decimal AgreedFeesPerHour { get; set; }
    public Guid? AccountsApprovalScheduleStatus { get; set; }
    public Guid? ApprovedBy { get; set; }
    public DateTime? ApprovedDate { get; set; }
}
