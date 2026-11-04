namespace TCT.LMS.DTOs.Schedule;

// Tutor cancellation allowance of one course (tutor-student-subject) for the calendar month of a class, and the
// course's cancelled classes that still need a make-up (TutorCancellationRules).
public class TutorCancellationSummaryDto
{
    public Guid SalesDetailsId { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public int WeeklyClasses { get; set; }
    public int MonthlyClasses { get; set; }
    public int? Allowed { get; set; }
    public int Used { get; set; }
    public int Remaining { get; set; }
    public bool CanCancel { get; set; }
    public decimal? DeductionPercent { get; set; }
    public string? ConfigError { get; set; }
    public string Message { get; set; } = "";
    public List<PendingMakeupDto> PendingMakeups { get; set; } = new();
}

public class PendingMakeupDto
{
    public Guid ScheduleDetailsId { get; set; }
    public DateTime ClassStart { get; set; }
    public DateTime ClassEnd { get; set; }
    public string Category { get; set; } = "";             // "tutor" or "student"
    public DateTime RescheduleBy { get; set; }             // last day of the class's month
    public string? MakeupRequestStatus { get; set; }       // Pending / Rejected, null when none was requested
    public string? MakeupRequestSummary { get; set; }
}

// Payroll review: a tutor cancellation not deducted because it is not certain whether it was re-scheduled.
public class CancellationReviewItemDto
{
    public Guid TrackingId { get; set; }
    public Guid ScheduleDetailsId { get; set; }
    public Guid TutorUserId { get; set; }
    public string TutorName { get; set; } = "";
    public string StudentName { get; set; } = "";
    public string Subject { get; set; } = "";
    public DateTime ClassStart { get; set; }
    public string Reason { get; set; } = "";
}

// A deduction applied to a pay slip, for the tutor's notification (sent once: TutorNotifiedAt).
public class CancellationDeductionNoticeDto
{
    public Guid TrackingId { get; set; }
    public Guid ScheduleDetailsId { get; set; }
    public Guid SalesDetailsId { get; set; }
    public Guid TutorUserId { get; set; }
    public string? StudentName { get; set; }
    public string? Subject { get; set; }
    public DateTime ClassStart { get; set; }
    public decimal Amount { get; set; }
    public decimal Percent { get; set; }
    public string? InvoiceNumber { get; set; }
}

// A tutor's or student's make-up class for one cancelled class: a single class, approved by Operations.
public class MakeupRequestDto
{
    public Guid ScheduleDetailsId { get; set; }            // the cancelled class
    public DateTime Start { get; set; }
    public DateTime End { get; set; }
}
