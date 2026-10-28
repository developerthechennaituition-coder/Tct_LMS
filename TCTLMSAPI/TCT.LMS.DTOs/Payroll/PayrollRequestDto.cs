namespace TCT.LMS.DTOs.Payroll;

public class PayrollRequestDto
{
    public Guid? TutorId { get; set; }
    public Guid? StudentId { get; set; }
    public string? TutorName { get; set; }
    public string? StudentName { get; set; }
    public string? UserCode { get; set; }
    public string? StudentCode { get; set; }
    public Guid? SalesId { get; set; }
    public Guid? SalesDetailsId { get; set; }
    public Guid? ScheduleId { get; set; }
    public Guid? ScheduleDetailsId { get; set; }
    public Guid? SubjectId { get; set; }
    public Guid? GradeId { get; set; }
    public Guid? BoardId { get; set; }
    public string? Subject { get; set; }
    public string? Grade { get; set; }
    public string? Board { get; set; }
    public decimal? TutorSubjectPayment { get; set; }
    public decimal? ParentSubjectPayment { get; set; }
    public decimal? TotalTutorPayment { get; set; }
    public decimal? TotalParentPayment { get; set; }
    public int? TotalNoOfClasses { get;   set; }
    public int? NoOfDaysPresent { get;   set; }
    public int? NoOfDaysAbsent { get;   set; }
    public int? Approved { get;   set; }
    public DateTime? ScheduleDate { get;   set; }
    public DateTime? ScheduleStartTime { get;   set; }
    public DateTime? ScheduleEndTime { get;   set; }
    public int ScheduleMonth { get; set; }
    public string? ScheduleMonthName { get; set; }
    public string? InvoiceMonthName { get; set; }
    public int ScheduleYear { get; set; }
    public Guid? CreatedBy { get; set; }
    public bool IsInvoiceGenerated { get; set; }
    public string? InvoiceNumber { get; set; }
    public string? PayrollStatus { get; set; }
    public List<string> InvoiceNumbers { get; set; } = new();
    public DateTime? CreatedDate { get; set; }
    public string InvoicePeriod { get; set; }
    public int NumberOfClasses { get; set; }
    public int? PreviousMonthTotalClasses { get; set; }
    public int? PreviousMonthPendingClasses { get; set; }
    public string PreviousMonthPendingClassesMonthYear { get; set; }

    public string? PaymentURL { get; set; }

    // Tutor contact details (populated from User table)
    public string? TutorEmail { get; set; }
    public string? TutorPhone { get; set; }
    public string? TutorUserCode { get; set; }

    // TCT organisation details (populated from TCTDetails table)
    public string? TctTitle { get; set; }
    public string? TctAddress1 { get; set; }
    public string? TctAddress2 { get; set; }
    public string? TctCity { get; set; }
    public string? TctState { get; set; }
    public string? TctZip { get; set; }
    public string? TctCountry { get; set; }
    public string? TctPhone { get; set; }
    public string? TctEmail { get; set; }
}
