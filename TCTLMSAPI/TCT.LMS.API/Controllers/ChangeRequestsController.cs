using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Domain.Entities;

namespace TCT.LMS.API.Controllers;

/// <summary>
/// Tutor Change (student), Student Change (tutor) and their review by Operations
/// (Request from Students / Request from Tutors). The caller's user id and roles come from the JWT,
/// and each endpoint also needs the matching menu in Settings → Role Permission.
/// </summary>
[ApiController]
[Authorize]
[Route("api/change-requests")]
public sealed class ChangeRequestsController : ControllerBase
{
    private readonly IAssignmentChangeRequestService _service;

    public ChangeRequestsController(IAssignmentChangeRequestService service) => _service = service;

    private Guid CallerId =>
        User.Claims
            .Where(claim => claim.Type == ClaimTypes.NameIdentifier
                || claim.Type.EndsWith("/nameidentifier", StringComparison.OrdinalIgnoreCase)
                || claim.Type.Equals("UserId", StringComparison.OrdinalIgnoreCase)
                || claim.Type.Equals("sub", StringComparison.OrdinalIgnoreCase))
            .Select(claim => Guid.TryParse(claim.Value, out var id) ? id : Guid.Empty)
            .FirstOrDefault(id => id != Guid.Empty);

    private IReadOnlyCollection<string> CallerRoles =>
        User.FindAll(ClaimTypes.Role).Select(c => c.Value).Where(r => !string.IsNullOrWhiteSpace(r)).Distinct().ToList();

    /// <summary>Null when the caller is signed in and has the menu; otherwise the 401/403 response.</summary>
    private async Task<IActionResult?> RejectAsync(string? menuLink, CancellationToken token)
    {
        if (CallerId == Guid.Empty)
            return Unauthorized(new { success = false, message = "Your login session is invalid. Please sign in again." });
        if (menuLink == null || !await _service.HasMenuPermissionAsync(CallerRoles, menuLink, token))
            return StatusCode(StatusCodes.Status403Forbidden,
                new { success = false, message = "You do not have permission for this page. A Super Admin can grant it in Settings → Role Permission." });
        return null;
    }

    private string? RequesterMenu()
    {
        var type = _service.RequestTypeForRequester(CallerRoles);
        return type == null ? null : _service.MenuLinkFor(type, operations: false);
    }

    private static string? OperationsType(string list) => list?.ToLowerInvariant() switch
    {
        "students" => AssignmentChangeRequestType.TutorChange,
        "tutors" => AssignmentChangeRequestType.StudentChange,
        _ => null,
    };

    private IActionResult FromResult<T>(ChangeRequestResult<T> result) =>
        result.Succeeded
            ? Ok(new { success = true, message = result.Message, data = result.Data })
            : StatusCode(result.StatusCode, new { success = false, message = result.Message });

    // ─── Student (Tutor Change) / Tutor (Student Change) ───────────────────────────

    [HttpGet("my-assignments")]
    public async Task<IActionResult> MyAssignments(CancellationToken token)
    {
        if (await RejectAsync(RequesterMenu(), token) is { } rejected) return rejected;
        return FromResult(await _service.GetMyAssignmentsAsync(CallerId, CallerRoles, token));
    }

    [HttpPost]
    public async Task<IActionResult> Submit([FromBody] SubmitChangeRequest input, CancellationToken token)
    {
        if (await RejectAsync(RequesterMenu(), token) is { } rejected) return rejected;
        return FromResult(await _service.SubmitAsync(CallerId, CallerRoles, input, token));
    }

    // ─── Operations (Request from Students / Request from Tutors) ──────────────────

    [HttpGet("operations/{list}")]
    public async Task<IActionResult> List(string list, CancellationToken token)
    {
        var type = OperationsType(list);
        if (type == null) return NotFound(new { success = false, message = "Unknown request list." });
        if (await RejectAsync(_service.MenuLinkFor(type, operations: true), token) is { } rejected) return rejected;
        return FromResult(await _service.GetRequestsAsync(CallerId, CallerRoles, type, token));
    }

    [HttpGet("operations/{list}/{requestId:guid}/replacement-tutors")]
    public async Task<IActionResult> ReplacementTutors(string list, Guid requestId, CancellationToken token)
    {
        var type = OperationsType(list);
        if (type == null) return NotFound(new { success = false, message = "Unknown request list." });
        if (await RejectAsync(_service.MenuLinkFor(type, operations: true), token) is { } rejected) return rejected;
        return FromResult(await _service.GetReplacementTutorsAsync(CallerId, CallerRoles, type, requestId, token));
    }

    [HttpPost("operations/{list}/{requestId:guid}/approve")]
    public async Task<IActionResult> Approve(string list, Guid requestId, [FromBody] ApproveChangeRequest input, CancellationToken token)
    {
        var type = OperationsType(list);
        if (type == null) return NotFound(new { success = false, message = "Unknown request list." });
        if (await RejectAsync(_service.MenuLinkFor(type, operations: true), token) is { } rejected) return rejected;
        return FromResult(await _service.ApproveAsync(CallerId, CallerRoles, type, requestId, input, token));
    }

    [HttpPost("operations/{list}/{requestId:guid}/reject")]
    public async Task<IActionResult> Reject(string list, Guid requestId, [FromBody] RejectChangeRequest input, CancellationToken token)
    {
        var type = OperationsType(list);
        if (type == null) return NotFound(new { success = false, message = "Unknown request list." });
        if (await RejectAsync(_service.MenuLinkFor(type, operations: true), token) is { } rejected) return rejected;
        return FromResult(await _service.RejectAsync(CallerId, CallerRoles, type, requestId, input, token));
    }
}
