using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.Domain.Entities;

public class TctLearningExperienceFeedback
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }

    public string TeacherQualityRating { get; set; }
    public string OverallExperienceRating { get; set; }

    public bool IssueTeachingMethod { get; set; }
    public bool IssuePunctuality { get; set; }
    public bool IssueCommunication { get; set; }
    public bool IssueTechnicalIssues { get; set; }
    public bool IssueOther { get; set; }

    public string Comments { get; set; }

    public bool IsFlaggedForReview { get; set; }
    public DateTime CreatedOnUtc { get; set; }
    public Guid? CreatedByUserId { get; set; }
}

