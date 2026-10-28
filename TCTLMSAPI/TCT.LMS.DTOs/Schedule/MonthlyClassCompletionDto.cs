namespace TCT.LMS.DTOs.Schedule;

// One student's subject (enrolment) for one month: how many of the month's classes are completed.
// Used for the "ClassCompletionAlertPercent" threshold that notifies Accounts.
public class MonthlyClassCompletionDto
{
    public Guid SalesId { get; set; }
    public Guid SalesDetailsId { get; set; }
    public int Month { get; set; }
    public int Year { get; set; }
    public int CompletedClasses { get; set; }
    // The month's scheduled regular classes that will take place (cancelled, postponed and
    // rescheduled occurrences excluded).
    public int TotalClasses { get; set; }
    // Accounts were already notified for this enrolment and month.
    public bool AlreadyNotified { get; set; }
}

// One row of the Accounts "Due Timings" list: a student's subject and its completion for the month.
public class ClassCompletionRowDto
{
    public Guid SalesDetailsId { get; set; }
    public Guid StudentId { get; set; }
    public Guid? StudentUserId { get; set; }
    public string StudentName { get; set; } = "";
    public string TutorName { get; set; } = "";
    public string Subject { get; set; } = "";
    public string Board { get; set; } = "";
    public string Grade { get; set; } = "";
    public int Month { get; set; }
    public int Year { get; set; }
    public int CompletedClasses { get; set; }
    public int TotalClasses { get; set; }
    public decimal CompletionPercent { get; set; }
    // Set when the month's parent invoice already covers this subject.
    public string? InvoiceNumber { get; set; }
}
