using TCT.LMS.Domain.Entities;

namespace TCT.LMS.Application.Interfaces.Repositories;

/// <summary>A course (student + subject) with its current tutor, as offered for a change request.</summary>
public sealed class ChangeAssignmentDto
{
    public Guid SalesDetailsId { get; set; }
    public Guid SalesId { get; set; }
    public Guid StudentId { get; set; }
    public string? StudentName { get; set; }
    /// <summary>dbo.Tutor.Id of the current tutor.</summary>
    public Guid TutorId { get; set; }
    public string? TutorName { get; set; }
    public Guid SubjectId { get; set; }
    public string? SubjectName { get; set; }
    public string? BoardName { get; set; }
    public string? GradeName { get; set; }
    public string? CourseStatusName { get; set; }
    public DateTime EnrolledDate { get; set; }
    /// <summary>Open request of the caller's type for this course, if any.</summary>
    public int? PendingRequestNo { get; set; }
}

/// <summary>A change request as listed / reviewed by Operations.</summary>
public sealed class ChangeRequestDto
{
    public Guid Id { get; set; }
    public int RequestNo { get; set; }
    public string RequestType { get; set; } = string.Empty;
    public Guid SalesDetailsId { get; set; }
    public Guid StudentId { get; set; }
    public string? StudentName { get; set; }
    public Guid CurrentTutorId { get; set; }
    public string? CurrentTutorName { get; set; }
    public string? SubjectName { get; set; }
    public string? BoardName { get; set; }
    public string? GradeName { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedDate { get; set; }
    public string? RequestedByName { get; set; }
    public Guid? NewTutorId { get; set; }
    public string? NewTutorName { get; set; }
    public string? DecidedByName { get; set; }
    public DateTime? DecidedDate { get; set; }
    public string? DecisionNote { get; set; }
    public int? MovedSessionCount { get; set; }
    /// <summary>Operations owner of the student (Sales.Ownership); used for scope checks, not shown.</summary>
    public Guid? OwnerUserId { get; set; }
    /// <summary>False when the course's tutor is no longer the one the request was raised about.</summary>
    public bool AssignmentUnchanged { get; set; }
}

/// <summary>A tutor who can teach the request's board, grade and subject.</summary>
public sealed class ReplacementTutorDto
{
    public Guid TutorId { get; set; }
    public Guid UserId { get; set; }
    public string? Name { get; set; }
    /// <summary>Configured skill-set rate for this board/grade/subject; approval needs a rate above zero.</summary>
    public decimal? Rate { get; set; }
}

/// <summary>An upcoming class session of the course that would move to the new tutor.</summary>
public sealed class ChangeRequestSessionDto
{
    public Guid ScheduleDetailsId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
}

public sealed record ChangeRequestApproveOutcome(bool Succeeded, int StatusCode, string Message, int MovedSessions)
{
    public static ChangeRequestApproveOutcome Ok(int moved) => new(true, 200, "Tutor reassigned.", moved);
    public static ChangeRequestApproveOutcome Fail(int statusCode, string message) => new(false, statusCode, message, 0);
}

public interface IAssignmentChangeRequestRepository
{
    /// <summary>True when one of the roles has View/Add/Edit/Delete on the menu with this link.</summary>
    Task<bool> HasMenuPermissionAsync(IReadOnlyCollection<string> roles, string link, CancellationToken token);

    /// <summary>The student's active courses that have a tutor (student identified by User.Id).</summary>
    Task<IReadOnlyList<ChangeAssignmentDto>> GetStudentAssignmentsAsync(Guid studentUserId, CancellationToken token);

    /// <summary>The tutor's active courses (tutor identified by User.Id).</summary>
    Task<IReadOnlyList<ChangeAssignmentDto>> GetTutorAssignmentsAsync(Guid tutorUserId, CancellationToken token);

    /// <summary>Saves a new Pending request. False when an open request of the same type already exists.</summary>
    Task<(bool Created, int RequestNo)> CreateRequestAsync(AssignmentChangeRequest request, CancellationToken token);

    /// <summary>Requests of a type, newest first; ownerUserId limits them to students owned by that Operations user.</summary>
    Task<IReadOnlyList<ChangeRequestDto>> GetRequestsAsync(string requestType, Guid? ownerUserId, CancellationToken token);

    Task<ChangeRequestDto?> GetRequestAsync(Guid requestId, CancellationToken token);

    /// <summary>Active tutors with an active skill set for the course's board, grade and subject, excluding one tutor.</summary>
    Task<IReadOnlyList<ReplacementTutorDto>> GetReplacementTutorsAsync(Guid salesDetailsId, Guid excludedTutorId, CancellationToken token);

    /// <summary>Active class sessions of the course with the given tutor that start after <paramref name="after"/> (IST).</summary>
    Task<IReadOnlyList<ChangeRequestSessionDto>> GetFutureSessionsAsync(Guid salesDetailsId, Guid tutorId, DateTime after, CancellationToken token);

    /// <summary>
    /// In one transaction: re-checks the request and assignment, moves the course's sessions after
    /// <paramref name="after"/> to the new tutor (splitting schedules), sets the course tutor and rate,
    /// replaces the allocation, records the decision and adds the notifications.
    /// </summary>
    Task<ChangeRequestApproveOutcome> ApproveAsync(Guid requestId, Guid newTutorId, Guid deciderUserId, string? note, DateTime after, CancellationToken token);

    /// <summary>Marks a Pending request Rejected (nothing else changes). False when it is no longer Pending.</summary>
    Task<bool> RejectAsync(Guid requestId, Guid deciderUserId, string note, CancellationToken token);
}
