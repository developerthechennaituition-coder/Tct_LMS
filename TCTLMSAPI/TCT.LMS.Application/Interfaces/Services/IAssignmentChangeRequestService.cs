using TCT.LMS.Application.Interfaces.Repositories;

namespace TCT.LMS.Application.Interfaces.Services;

public sealed record ChangeRequestResult<T>(bool Succeeded, int StatusCode, string? Message, T? Data)
{
    public static ChangeRequestResult<T> Ok(T data, string? message = null) => new(true, 200, message, data);
    public static ChangeRequestResult<T> Fail(int statusCode, string message) => new(false, statusCode, message, default);
}

public sealed class SubmitChangeRequest
{
    public Guid SalesDetailsId { get; set; }
    public string? Reason { get; set; }
    public string? Description { get; set; }
}

public sealed class ApproveChangeRequest
{
    public Guid NewTutorId { get; set; }
    public string? Note { get; set; }
}

public sealed class RejectChangeRequest
{
    public string? Note { get; set; }
}

public sealed class MyChangeAssignments
{
    /// <summary>TutorChange (student) or StudentChange (tutor).</summary>
    public string RequestType { get; set; } = string.Empty;
    public IReadOnlyList<string> Reasons { get; set; } = Array.Empty<string>();
    public IReadOnlyList<ChangeAssignmentDto> Assignments { get; set; } = Array.Empty<ChangeAssignmentDto>();
}

public interface IAssignmentChangeRequestService
{
    /// <summary>Menu links (Settings → Role Permission) that grant each part of the workflow.</summary>
    string MenuLinkFor(string requestType, bool operations);

    /// <summary>TutorChange for a Student, StudentChange for a Tutor, otherwise null.</summary>
    string? RequestTypeForRequester(IReadOnlyCollection<string> roles);

    Task<bool> HasMenuPermissionAsync(IReadOnlyCollection<string> roles, string link, CancellationToken token);

    Task<ChangeRequestResult<MyChangeAssignments>> GetMyAssignmentsAsync(Guid callerUserId, IReadOnlyCollection<string> roles, CancellationToken token);

    Task<ChangeRequestResult<int>> SubmitAsync(Guid callerUserId, IReadOnlyCollection<string> roles, SubmitChangeRequest input, CancellationToken token);

    Task<ChangeRequestResult<IReadOnlyList<ChangeRequestDto>>> GetRequestsAsync(Guid callerUserId, IReadOnlyCollection<string> roles, string requestType, CancellationToken token);

    // requestType = the list the caller is working in; a request of the other type answers 404.
    Task<ChangeRequestResult<IReadOnlyList<ReplacementTutorDto>>> GetReplacementTutorsAsync(Guid callerUserId, IReadOnlyCollection<string> roles, string requestType, Guid requestId, CancellationToken token);

    Task<ChangeRequestResult<int>> ApproveAsync(Guid callerUserId, IReadOnlyCollection<string> roles, string requestType, Guid requestId, ApproveChangeRequest input, CancellationToken token);

    Task<ChangeRequestResult<bool>> RejectAsync(Guid callerUserId, IReadOnlyCollection<string> roles, string requestType, Guid requestId, RejectChangeRequest input, CancellationToken token);
}
