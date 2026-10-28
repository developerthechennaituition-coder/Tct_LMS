using System;
using System.Collections.Generic;

namespace TCT.LMS.Domain.Entities;

/// <summary>
/// A request to change the tutor of a course: raised by the student (Tutor Change) or by the tutor
/// (Student Change), decided by Operations. Table: dbo.AssignmentChangeRequest
/// (TCTDatabase/DDL/TutorStudentChangeRequests.sql). Submitting changes nothing; the course is
/// reassigned only when Operations approves.
/// </summary>
public class AssignmentChangeRequest : BaseEntity
{
    public Guid Id { get; set; }
    /// <summary>Readable request number (database identity).</summary>
    public int RequestNo { get; set; }
    public string RequestType { get; set; } = AssignmentChangeRequestType.TutorChange;
    public Guid SalesDetailsId { get; set; }
    public Guid StudentId { get; set; }
    public Guid CurrentTutorId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = AssignmentChangeRequestStatus.Pending;
    public Guid? NewTutorId { get; set; }
    public Guid? DecidedBy { get; set; }
    public DateTime? DecidedDate { get; set; }
    public string? DecisionNote { get; set; }
    public int? MovedSessionCount { get; set; }
}

public static class AssignmentChangeRequestType
{
    /// <summary>Raised by a student about their tutor.</summary>
    public const string TutorChange = "TutorChange";
    /// <summary>Raised by a tutor about their student.</summary>
    public const string StudentChange = "StudentChange";
}

public static class AssignmentChangeRequestStatus
{
    public const string Pending = "Pending";
    public const string Reassigned = "Reassigned";
    public const string Rejected = "Rejected";
}

public static class AssignmentChangeRequestReasons
{
    public static readonly IReadOnlyList<string> TutorChange = new[]
    {
        "Lack of Compatibility",
        "Unprofessional Behaviour",
        "Communication Barrier",
        "Skill Mismatch",
        "Lack of Personalization",
    };

    public static readonly IReadOnlyList<string> StudentChange = new[]
    {
        "Lack of Effort and Commitment",
        "Disrespectful or Disruptive Behaviour",
        "Frequent Payment Delays",
        "Unrealistic Expectations",
        "Incompatible Goals or Levels",
    };

    public static IReadOnlyList<string> For(string requestType) =>
        requestType == AssignmentChangeRequestType.StudentChange ? StudentChange : TutorChange;
}
