using System;

namespace TCT.LMS.Domain.Entities;

public class TctTutorDailyFeedback
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }

    public string FeelingRating { get; set; }
    public string Comments { get; set; }

    public bool IsFlaggedForReview { get; set; }
    public DateTime CreatedOnUtc { get; set; }
    public Guid? CreatedByUserId { get; set; }
}
