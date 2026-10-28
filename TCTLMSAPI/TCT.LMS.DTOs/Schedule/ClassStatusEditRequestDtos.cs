namespace TCT.LMS.DTOs.Schedule;

public class ClassStatusEditRequestCreateDto
{
    public Guid ScheduleDetailsId { get; set; }
    public string? Reason { get; set; }
}

public class ClassStatusEditDecisionDto
{
    public bool Approve { get; set; }
    public string? Comment { get; set; }
}

// One request with what Operations need to decide on it.
public class ClassStatusEditRequestDto
{
    public Guid Id { get; set; }
    public Guid ScheduleDetailsId { get; set; }
    public Guid SalesDetailsId { get; set; }
    public Guid RequestedBy { get; set; }
    public string RequesterType { get; set; } = "";
    public string RequesterName { get; set; } = "";
    public string StudentName { get; set; } = "";
    public string TutorName { get; set; } = "";
    public string Subject { get; set; } = "";
    public DateTime ClassStart { get; set; }
    public DateTime ClassEnd { get; set; }
    public string? CurrentStatus { get; set; }
    public string? Reason { get; set; }
    public string Status { get; set; } = "";
    public string? DecisionComment { get; set; }
    public DateTime CreatedDate { get; set; }
}

public class ClassStatusEditResultDto
{
    public bool Succeeded { get; set; }
    public string Message { get; set; } = "";
    public ClassStatusEditRequestDto? Request { get; set; }
}
