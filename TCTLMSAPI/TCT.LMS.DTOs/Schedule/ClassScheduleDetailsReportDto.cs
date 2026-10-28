namespace TCT.LMS.DTOs.Schedule;

public class ClassScheduleDetailsReportDto
{
    // Student Details
    public Guid StudentId { get; set; }
    public Guid StudentUserId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public int? StudentRoleId { get; set; }
    public string? StudentRoleName { get; set; }

    // Tutor Details
    public Guid TutorId { get; set; }
    public Guid TutorUserId { get; set; }
    public string TutorName { get; set; } = string.Empty;
    public int? TutorRoleId { get; set; }
    public string? TutorRoleName { get; set; }

    // Ownership Details
    public Guid? OwnershipUserId { get; set; }
    public string? OwnershipName { get; set; }
    public int? OwnershipRoleId { get; set; }
    public string? OwnershipRoleName { get; set; }

    // Coordinator Details
    public Guid? CoordinatorUserId { get; set; }
    public string? CoordinatorName { get; set; }
    public int? CoordinatorRoleId { get; set; }
    public string? CoordinatorRoleName { get; set; }

    // Main Transaction Details
    public Guid SalesId { get; set; }
    public Guid SalesDetailsId { get; set; }
    public Guid ScheduleId { get; set; }
    public Guid ScheduleDetailsId { get; set; }
    public string ScheduleType { get; set; } = string.Empty;

    // Schedule Details
    public DateTime? Date { get; set; }
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public string? TutorComment { get; set; }
    public string? StudentComment { get; set; }
    public string? ScheduleStatus { get; set; }

    public Guid? TutorScheduleStatusId { get; set; }
    public string? TutorScheduleStatusName { get; set; }
    public int? TutorScheduleStatusCode { get; set; }

    public Guid? StudentScheduleStatusId { get; set; }
    public string? StudentScheduleStatusName { get; set; }
    public int? StudentScheduleStatusCode { get; set; }

    public Guid? OperationScheduleStatusId { get; set; }
    public string? OperationScheduleStatusName { get; set; }
    public Guid? AccountsApprovalScheduleStatus { get; set; }
    public int? AccountsApprovalStatusCode { get; set; }
    public string? AccountsApprovalStatusName { get; set; }

    public bool? IsTutorPresent { get; set; }
    public bool? IsStudentPresent { get; set; }
    public string? Comment { get; set; }
    public string? Title { get; set; }
    public string? MeetingLink { get; set; }

    public DateTime? TutorStartTime { get; set; }
    public DateTime? TutorEndTime { get; set; }
    public DateTime? StudentStartTime { get; set; }
    public DateTime? StudentEndTime { get; set; }
    public DateTime? OperationStartTime { get; set; }
    public DateTime? OperationEndTime { get; set; }

    // Board / Grade / Subject
    public string? Board { get; set; }
    public string? Grade { get; set; }
    public string? Subject { get; set; }

    // Payment & Payslip
    public decimal? ParentPayment { get; set; }
    public decimal? TutorPayment { get; set; }
    public decimal? TutorClassPayment { get; set; }
    public string? PayslipInvoiceNumber { get; set; }
}

public class ClassScheduleReportDto
{
    public Guid StudentId { get; set; }
    public Guid StudentUserId { get; set; }
    public string StudentName { get; set; }
    public DateTime? Date { get; set; }
    public TimeSpan? StartTime { get; set; }
}

public class ClassScheduleTutorReportDto
{
    public Guid TutorId { get; set; }
    public Guid TutorUserId { get; set; }
    public string TutorName { get; set; }
}
