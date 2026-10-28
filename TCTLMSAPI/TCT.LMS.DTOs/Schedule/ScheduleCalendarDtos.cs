namespace TCT.LMS.DTOs.Schedule;

// Schedule Calendar page (Operations: view and change a student's weekly classes with a tutor).
public class ScheduleCalendarTutorDto
{
    public Guid TutorId { get; set; }
    public string Name { get; set; } = "";
}

// Operations: the student dropdown, independent of the tutor dropdown. StudentId = Student.Id.
public class ScheduleCalendarStudentDto
{
    public Guid StudentId { get; set; }
    public string Name { get; set; } = "";
}

// One class on a single person's calendar (Operations: tutor calendar or student calendar).
public class ScheduleCalendarPersonEventDto
{
    public Guid ScheduleDetailsId { get; set; }
    public Guid SalesDetailsId { get; set; }
    public DateTime Start { get; set; }
    public DateTime End { get; set; }
    // Regular, Temporary, OneTime or Demo.
    public string Kind { get; set; } = "";
    public string? Status { get; set; }
    public string Subject { get; set; } = "";
    // The other person: the student on a tutor's calendar, the tutor on a student's calendar.
    public string OtherName { get; set; } = "";
}

public class ScheduleCalendarEnrolmentDto
{
    public Guid SalesDetailsId { get; set; }
    public Guid StudentId { get; set; }
    public string StudentName { get; set; } = "";
    public string TutorName { get; set; } = "";
    public string Subject { get; set; } = "";
    // e.g. "Mon 07:00 PM, Wed 07:00 PM" from the latest weekly schedule; empty when there is none.
    public string WeeklyPattern { get; set; } = "";
    public bool HasWeeklySchedule { get; set; }
}

public class ScheduleCalendarEventDto
{
    public Guid? ScheduleDetailsId { get; set; }
    public DateTime Start { get; set; }
    public DateTime End { get; set; }
    // Regular (weekly), Temporary (1-4 week change), OneTime, TutorBusy, StudentBusy.
    public string Kind { get; set; } = "";
    public string? Status { get; set; }
}

public class WeeklyDayChangeRequestDto
{
    public Guid SalesDetailsId { get; set; }
    public DateTime FromDate { get; set; }
    // 0 = Sunday ... 6 = Saturday.
    public List<int> Days { get; set; } = new();
    // "HH:mm", e.g. "19:00".
    public string StartTime { get; set; } = "";
    public string EndTime { get; set; } = "";
    // 1-4 = that many weeks from FromDate; 0 = Permanent.
    public int Weeks { get; set; }
}

public class WeeklyDayChangeResultDto
{
    public bool Succeeded { get; set; }
    public string Message { get; set; } = "";
    public List<DateTime> ClassDates { get; set; } = new();
    // Set when the request was refused because the tutor and/or the student already has a class then.
    public DateTime? ClashStart { get; set; }
    public DateTime? ClashEnd { get; set; }
    public bool TutorBusy { get; set; }
    public bool StudentBusy { get; set; }
}

// A tutor's or student's request to add class day(s), waiting for (or decided by) Operations.
public class ScheduleChangeRequestDto
{
    public Guid Id { get; set; }
    public Guid SalesDetailsId { get; set; }
    public Guid? TutorId { get; set; } // Tutor.Id, so Operations' page can select the tutor
    public Guid RequestedBy { get; set; }
    public string RequesterType { get; set; } = "";
    public string RequesterName { get; set; } = "";
    public string StudentName { get; set; } = "";
    public string TutorName { get; set; } = "";
    public string Subject { get; set; } = "";
    public DateTime FromDate { get; set; }
    public List<int> Days { get; set; } = new();
    public string StartTime { get; set; } = "";
    public string EndTime { get; set; } = "";
    public int Weeks { get; set; }
    public string? Summary { get; set; }
    public string Status { get; set; } = "";
    public string? DecisionComment { get; set; }
    public DateTime CreatedDate { get; set; }
    public string? RequestKind { get; set; } // null = add class day(s); "PermanentReschedule"
    public Guid? ScheduleDetailsId { get; set; }
}

public class ScheduleChangeDecisionDto
{
    public bool Approve { get; set; }
    public string? Comment { get; set; }
}

public class ScheduleChangeRequestResultDto
{
    public bool Succeeded { get; set; }
    public string Message { get; set; } = "";
    public ScheduleChangeRequestDto? Request { get; set; }
    public bool AlreadyPending { get; set; } // refused only because the same request is already waiting
}
