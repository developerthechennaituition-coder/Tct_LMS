using System;

namespace TCT.LMS.DTOs.Dashboard;

public class TctTutorDailyFeedbackDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string FeelingRating { get; set; }
    public string Comments { get; set; }
}
