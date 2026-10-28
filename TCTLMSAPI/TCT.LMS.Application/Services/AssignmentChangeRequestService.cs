using Common;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Domain.Entities;

namespace TCT.LMS.Application.Services;

/// <summary>
/// Tutor Change (student) / Student Change (tutor) requests and their review by Operations.
/// Every identity comes from the caller (JWT); request bodies never name the student, tutor or decider.
/// </summary>
public sealed class AssignmentChangeRequestService : IAssignmentChangeRequestService
{
    public const string StudentRequestsMenuLink = "/lms/operation/change-requests/students";
    public const string TutorRequestsMenuLink = "/lms/operation/change-requests/tutors";
    public const string TutorChangeMenuLink = "/lms/change-request/tutor-change";
    public const string StudentChangeMenuLink = "/lms/change-request/student-change";
    public const int MaxDescriptionLength = 2000;
    public const int MaxNoteLength = 1000;

    // Operations sees the students it owns (Sales.Ownership); these roles see every request.
    private static readonly string[] AllRequestRoles = { "SuperAdmin", "Admin", "OperationsAdmin" };

    private readonly IAssignmentChangeRequestRepository _repository;
    private readonly IScheduleRepository _scheduleRepository;
    private readonly Func<DateTime> _istNow;

    public AssignmentChangeRequestService(IAssignmentChangeRequestRepository repository, IScheduleRepository scheduleRepository)
        : this(repository, scheduleRepository, () => DateHelper.TCTConvertTimeFromUtc(DateTime.UtcNow)) { }

    /// <summary>For tests: a fixed "now" (India Standard Time, the time zone class times are stored in).</summary>
    public AssignmentChangeRequestService(IAssignmentChangeRequestRepository repository, IScheduleRepository scheduleRepository, Func<DateTime> istNow)
    {
        _repository = repository;
        _scheduleRepository = scheduleRepository;
        _istNow = istNow;
    }

    private static bool HasRole(IReadOnlyCollection<string> roles, string role) =>
        roles.Any(r => string.Equals(r?.Trim(), role, StringComparison.OrdinalIgnoreCase));

    public string MenuLinkFor(string requestType, bool operations) =>
        requestType == AssignmentChangeRequestType.StudentChange
            ? operations ? TutorRequestsMenuLink : StudentChangeMenuLink
            : operations ? StudentRequestsMenuLink : TutorChangeMenuLink;

    public string? RequestTypeForRequester(IReadOnlyCollection<string> roles) =>
        HasRole(roles, "Student") ? AssignmentChangeRequestType.TutorChange
        : HasRole(roles, "Tutor") ? AssignmentChangeRequestType.StudentChange
        : null;

    public Task<bool> HasMenuPermissionAsync(IReadOnlyCollection<string> roles, string link, CancellationToken token) =>
        _repository.HasMenuPermissionAsync(roles, link, token);

    // ─── Student / tutor ──────────────────────────────────────────────────────────

    private Task<IReadOnlyList<ChangeAssignmentDto>> AssignmentsFor(string requestType, Guid callerUserId, CancellationToken token) =>
        requestType == AssignmentChangeRequestType.TutorChange
            ? _repository.GetStudentAssignmentsAsync(callerUserId, token)
            : _repository.GetTutorAssignmentsAsync(callerUserId, token);

    public async Task<ChangeRequestResult<MyChangeAssignments>> GetMyAssignmentsAsync(Guid callerUserId, IReadOnlyCollection<string> roles, CancellationToken token)
    {
        var type = RequestTypeForRequester(roles);
        if (type == null) return ChangeRequestResult<MyChangeAssignments>.Fail(403, "Change requests are available to students and tutors only.");
        return ChangeRequestResult<MyChangeAssignments>.Ok(new MyChangeAssignments
        {
            RequestType = type,
            Reasons = AssignmentChangeRequestReasons.For(type),
            Assignments = await AssignmentsFor(type, callerUserId, token),
        });
    }

    public async Task<ChangeRequestResult<int>> SubmitAsync(Guid callerUserId, IReadOnlyCollection<string> roles, SubmitChangeRequest input, CancellationToken token)
    {
        var type = RequestTypeForRequester(roles);
        if (type == null) return ChangeRequestResult<int>.Fail(403, "Change requests are available to students and tutors only.");

        var reason = input?.Reason?.Trim();
        var description = input?.Description?.Trim();
        if (string.IsNullOrEmpty(reason) || !AssignmentChangeRequestReasons.For(type).Contains(reason))
            return ChangeRequestResult<int>.Fail(400, "Please select a reason.");
        if (string.IsNullOrEmpty(description))
            return ChangeRequestResult<int>.Fail(400, "Please describe the reason for your request.");
        if (description.Length > MaxDescriptionLength)
            return ChangeRequestResult<int>.Fail(400, $"Use {MaxDescriptionLength} characters or fewer.");

        // Ownership: the course must be one of the caller's own (resolved from the caller, never the payload).
        var assignment = (await AssignmentsFor(type, callerUserId, token)).FirstOrDefault(a => a.SalesDetailsId == input!.SalesDetailsId);
        if (assignment == null)
            return ChangeRequestResult<int>.Fail(404, "This course is not one of your current assignments.");
        if (assignment.PendingRequestNo.HasValue)
            return ChangeRequestResult<int>.Fail(409, $"Request #{assignment.PendingRequestNo} for this course is already waiting for Operations.");

        var (created, requestNo) = await _repository.CreateRequestAsync(new AssignmentChangeRequest
        {
            Id = Guid.NewGuid(),
            RequestType = type,
            SalesDetailsId = assignment.SalesDetailsId,
            StudentId = assignment.StudentId,
            CurrentTutorId = assignment.TutorId,
            Reason = reason,
            Description = description,
            Status = AssignmentChangeRequestStatus.Pending,
            CreatedBy = callerUserId,
            CreatedDate = DateTime.UtcNow,
            IsActive = true,
        }, token);
        return created
            ? ChangeRequestResult<int>.Ok(requestNo, $"Request #{requestNo} sent to Operations.")
            : ChangeRequestResult<int>.Fail(409, "A request for this course is already waiting for Operations.");
    }

    // ─── Operations ───────────────────────────────────────────────────────────────

    /// <summary>Null owner = every request; otherwise only students owned by the caller. Fails for other roles.</summary>
    private static (bool Allowed, Guid? Owner) OperationsScope(Guid callerUserId, IReadOnlyCollection<string> roles)
    {
        if (AllRequestRoles.Any(r => HasRole(roles, r))) return (true, null);
        if (HasRole(roles, "Operations")) return (true, callerUserId);
        return (false, null);
    }

    private async Task<(ChangeRequestDto? Request, string? Error, int Status)> LoadInScopeAsync(Guid callerUserId, IReadOnlyCollection<string> roles,
        string requestType, Guid requestId, CancellationToken token)
    {
        var (allowed, owner) = OperationsScope(callerUserId, roles);
        if (!allowed) return (null, "Only Operations can review change requests.", 403);
        var request = await _repository.GetRequestAsync(requestId, token);
        // Out-of-scope requests (other owner, or the other list) answer 404, so their existence is not revealed.
        if (request == null || request.RequestType != requestType || (owner.HasValue && request.OwnerUserId != owner))
            return (null, "The request was not found.", 404);
        return (request, null, 200);
    }

    public async Task<ChangeRequestResult<IReadOnlyList<ChangeRequestDto>>> GetRequestsAsync(Guid callerUserId, IReadOnlyCollection<string> roles, string requestType, CancellationToken token)
    {
        if (requestType != AssignmentChangeRequestType.TutorChange && requestType != AssignmentChangeRequestType.StudentChange)
            return ChangeRequestResult<IReadOnlyList<ChangeRequestDto>>.Fail(400, "Unknown request type.");
        var (allowed, owner) = OperationsScope(callerUserId, roles);
        if (!allowed) return ChangeRequestResult<IReadOnlyList<ChangeRequestDto>>.Fail(403, "Only Operations can review change requests.");
        return ChangeRequestResult<IReadOnlyList<ChangeRequestDto>>.Ok(await _repository.GetRequestsAsync(requestType, owner, token));
    }

    public async Task<ChangeRequestResult<IReadOnlyList<ReplacementTutorDto>>> GetReplacementTutorsAsync(Guid callerUserId, IReadOnlyCollection<string> roles, string requestType, Guid requestId, CancellationToken token)
    {
        var (request, error, status) = await LoadInScopeAsync(callerUserId, roles, requestType, requestId, token);
        if (request == null) return ChangeRequestResult<IReadOnlyList<ReplacementTutorDto>>.Fail(status, error!);
        return ChangeRequestResult<IReadOnlyList<ReplacementTutorDto>>.Ok(
            await _repository.GetReplacementTutorsAsync(request.SalesDetailsId, request.CurrentTutorId, token));
    }

    public async Task<ChangeRequestResult<int>> ApproveAsync(Guid callerUserId, IReadOnlyCollection<string> roles, string requestType, Guid requestId, ApproveChangeRequest input, CancellationToken token)
    {
        var (request, error, status) = await LoadInScopeAsync(callerUserId, roles, requestType, requestId, token);
        if (request == null) return ChangeRequestResult<int>.Fail(status, error!);
        if (request.Status != AssignmentChangeRequestStatus.Pending) return ChangeRequestResult<int>.Fail(409, "This request has already been decided.");
        if (input == null || input.NewTutorId == Guid.Empty) return ChangeRequestResult<int>.Fail(400, "Select the new tutor.");
        if (input.NewTutorId == request.CurrentTutorId) return ChangeRequestResult<int>.Fail(400, "Choose a tutor other than the current tutor.");
        if ((input.Note?.Trim().Length ?? 0) > MaxNoteLength) return ChangeRequestResult<int>.Fail(400, $"Use {MaxNoteLength} characters or fewer for the note.");

        var replacement = (await _repository.GetReplacementTutorsAsync(request.SalesDetailsId, request.CurrentTutorId, token))
            .FirstOrDefault(t => t.TutorId == input.NewTutorId);
        if (replacement == null) return ChangeRequestResult<int>.Fail(400, "The selected tutor does not teach this board, grade and subject.");
        if (!(replacement.Rate > 0))
            return ChangeRequestResult<int>.Fail(400, "The selected tutor has no payment rate configured for this board, grade and subject. Set it in the tutor's skill sets first.");

        // The new tutor must be free for every upcoming class that moves (existing conflict rule;
        // Schedule.TutorId holds the Tutor.Id or, on older rows, the tutor's User.Id).
        var after = _istNow();
        var sessions = await _repository.GetFutureSessionsAsync(request.SalesDetailsId, request.CurrentTutorId, after, token);
        foreach (var session in sessions)
        {
            if (await _scheduleRepository.HasTutorScheduleConflictAsync(replacement.TutorId, session.StartTime, session.EndTime, request.SalesDetailsId)
                || await _scheduleRepository.HasTutorScheduleConflictAsync(replacement.UserId, session.StartTime, session.EndTime, request.SalesDetailsId))
            {
                return ChangeRequestResult<int>.Fail(409,
                    $"{replacement.Name} already has a class on {session.StartTime:dd MMM yyyy} between {session.StartTime:hh:mm tt} and {session.EndTime:hh:mm tt}. Choose another tutor or reschedule first.");
            }
        }

        var outcome = await _repository.ApproveAsync(request.Id, replacement.TutorId, callerUserId, input.Note, after, token);
        return outcome.Succeeded
            ? ChangeRequestResult<int>.Ok(outcome.MovedSessions,
                $"Request #{request.RequestNo}: {request.StudentName}'s {request.SubjectName} is now with {replacement.Name}" +
                (outcome.MovedSessions > 0 ? $" ({outcome.MovedSessions} upcoming class{(outcome.MovedSessions == 1 ? "" : "es")} moved)." : "."))
            : ChangeRequestResult<int>.Fail(outcome.StatusCode, outcome.Message);
    }

    public async Task<ChangeRequestResult<bool>> RejectAsync(Guid callerUserId, IReadOnlyCollection<string> roles, string requestType, Guid requestId, RejectChangeRequest input, CancellationToken token)
    {
        var (request, error, status) = await LoadInScopeAsync(callerUserId, roles, requestType, requestId, token);
        if (request == null) return ChangeRequestResult<bool>.Fail(status, error!);
        var note = input?.Note?.Trim();
        if (string.IsNullOrEmpty(note)) return ChangeRequestResult<bool>.Fail(400, "Please give the reason for rejecting this request.");
        if (note.Length > MaxNoteLength) return ChangeRequestResult<bool>.Fail(400, $"Use {MaxNoteLength} characters or fewer for the reason.");
        if (request.Status != AssignmentChangeRequestStatus.Pending) return ChangeRequestResult<bool>.Fail(409, "This request has already been decided.");
        return await _repository.RejectAsync(request.Id, callerUserId, note, token)
            ? ChangeRequestResult<bool>.Ok(true, $"Request #{request.RequestNo} rejected. The current assignment is unchanged.")
            : ChangeRequestResult<bool>.Fail(409, "This request has already been decided.");
    }
}
