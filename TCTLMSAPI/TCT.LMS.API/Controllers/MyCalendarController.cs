using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TCT.LMS.Application.Interfaces.Services;

namespace TCT.LMS.API.Controllers;

/// <summary>
/// My Calendar (demo classes) and its Tasks tab, for every role except Tutor and Student.
/// The caller's user id and role always come from the JWT; request bodies never carry the sender.
/// </summary>
[ApiController]
[Authorize]
[Route("api/my-calendar")]
public sealed class MyCalendarController : ControllerBase
{
    private readonly IMyCalendarService _service;

    public MyCalendarController(IMyCalendarService service) => _service = service;

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

    /// <summary>Null when the caller may use My Calendar; otherwise the 401/403 response to return.</summary>
    private IActionResult? Reject()
    {
        if (CallerId == Guid.Empty)
            return Unauthorized(new { success = false, message = "Your login session is invalid. Please sign in again." });
        if (!_service.IsEligible(CallerRoles))
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = "My Calendar is not available for your role." });
        return null;
    }

    private IActionResult FromResult<T>(MyCalendarResult<T> result) =>
        result.Succeeded
            ? Ok(new { success = true, message = result.Message, data = result.Data })
            : StatusCode(result.StatusCode, new { success = false, message = result.Message });

    [HttpGet("demos")]
    public async Task<IActionResult> Demos([FromQuery] int month, [FromQuery] int year, CancellationToken token)
    {
        if (Reject() is { } rejected) return rejected;
        return FromResult(await _service.GetDemoSchedulesAsync(CallerId, CallerRoles, month, year, token));
    }

    [HttpGet("classes")]
    public async Task<IActionResult> Classes([FromQuery] int month, [FromQuery] int year, CancellationToken token)
    {
        if (Reject() is { } rejected) return rejected;
        return FromResult(await _service.GetClassSchedulesAsync(CallerId, CallerRoles, month, year, token));
    }

    [HttpGet("task-assignees")]
    public async Task<IActionResult> TaskAssignees(CancellationToken token)
    {
        if (Reject() is { } rejected) return rejected;
        return Ok(new { success = true, data = await _service.GetTaskAssigneesAsync(token) });
    }

    [HttpGet("tasks")]
    public async Task<IActionResult> Tasks(CancellationToken token)
    {
        if (Reject() is { } rejected) return rejected;
        return Ok(new { success = true, data = await _service.GetTasksAsync(CallerId, token) });
    }

    [HttpPost("tasks")]
    public async Task<IActionResult> CreateTask([FromBody] CreateUserTaskRequest request, CancellationToken token)
    {
        if (Reject() is { } rejected) return rejected;
        if (request == null) return BadRequest(new { success = false, message = "Task details are required." });
        return FromResult(await _service.CreateTaskAsync(CallerId, request, token));
    }

    [HttpPut("tasks/{taskId:guid}/complete")]
    public async Task<IActionResult> CompleteTask(Guid taskId, CancellationToken token)
    {
        if (Reject() is { } rejected) return rejected;
        return FromResult(await _service.CompleteTaskAsync(CallerId, taskId, token));
    }

    // ─── Demo status workflow ───

    /// <summary>The 12 demo statuses (label, code, id, required fields) and the dropout reasons.</summary>
    [HttpGet("demo-statuses")]
    public async Task<IActionResult> DemoStatuses(CancellationToken token)
    {
        if (Reject() is { } rejected) return rejected;
        return Ok(new { success = true, data = await _service.GetDemoStatusOptionsAsync(token) });
    }

    /// <summary>Follow-up windows (status date ranges) overlapping the month, in the caller's demo scope.</summary>
    [HttpGet("follow-ups")]
    public async Task<IActionResult> FollowUps([FromQuery] int month, [FromQuery] int year, CancellationToken token)
    {
        if (Reject() is { } rejected) return rejected;
        return FromResult(await _service.GetFollowUpsAsync(CallerId, CallerRoles, month, year, token));
    }

    [HttpGet("demo-status/{salesDetailsId:guid}")]
    public async Task<IActionResult> DemoStatus(Guid salesDetailsId, CancellationToken token)
    {
        if (Reject() is { } rejected) return rejected;
        return FromResult(await _service.GetEnrollmentStatusAsync(CallerId, CallerRoles, salesDetailsId, token));
    }

    [HttpPut("demo-status")]
    public async Task<IActionResult> UpdateDemoStatus([FromBody] UpdateDemoStatusRequest request, CancellationToken token)
    {
        if (Reject() is { } rejected) return rejected;
        if (request == null) return BadRequest(new { success = false, message = "Status details are required." });
        return FromResult(await _service.UpdateDemoStatusAsync(CallerId, CallerRoles, request, token));
    }
}
