using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.DTOs.Schedule;

namespace TCT.LMS.API.Controllers;

// A tutor's or student's saved class status is locked for them. They request an edit here; Operations
// approve or reject it from their notification. Approved: the class is editable for them for one more save.
[ApiController]
[Route("api/class-status-edit-request")]
[Authorize]
public class ClassStatusEditRequestController : ControllerBase
{
    private const string DeciderRoles = "Operations,OperationsAdmin,SuperAdmin,Admin";
    private readonly IScheduleRepository _repository;
    private readonly INotificationService _notificationService;
    private readonly ILogger<ClassStatusEditRequestController> _logger;

    public ClassStatusEditRequestController(IScheduleRepository repository, INotificationService notificationService,
        ILogger<ClassStatusEditRequestController> logger)
    {
        _repository = repository;
        _notificationService = notificationService;
        _logger = logger;
    }

    // The "UserId" claim first: the JWT handler maps "sub" onto NameIdentifier, which is not a user id here.
    private Guid? CurrentUserId =>
        Guid.TryParse(User.FindFirst("UserId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id) && id != Guid.Empty
            ? id : null;

    [HttpPost]
    [Authorize(Roles = "Tutor,Student")]
    public async Task<IActionResult> Create([FromBody] ClassStatusEditRequestCreateDto input)
    {
        if (input == null || input.ScheduleDetailsId == Guid.Empty) return BadRequest(new { succeeded = false, message = "Select a class." });
        if (CurrentUserId is not Guid userId) return Unauthorized();
        var requesterType = User.IsInRole("Tutor") ? "tutor" : "student";

        var result = await _repository.CreateStatusEditRequestAsync(input.ScheduleDetailsId, userId, requesterType, input.Reason);
        if (!result.Succeeded) return BadRequest(result);
        try
        {
            await _notificationService.AddStatusEditRequestNotifications(result.Request!);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Status edit request notification failed for ScheduleDetails {ScheduleDetailsId}", input.ScheduleDetailsId);
        }
        return Ok(result);
    }

    // Operations' notification refers to the class; this returns its latest request.
    [HttpGet("by-class/{scheduleDetailsId:guid}")]
    [Authorize(Roles = DeciderRoles)]
    public async Task<IActionResult> LatestForClass(Guid scheduleDetailsId)
    {
        var request = await _repository.GetLatestStatusEditRequestAsync(scheduleDetailsId);
        return request == null ? NotFound(new { succeeded = false, message = "No edit request found for this class." }) : Ok(request);
    }

    [HttpPost("{id:guid}/decision")]
    [Authorize(Roles = DeciderRoles)]
    public async Task<IActionResult> Decide(Guid id, [FromBody] ClassStatusEditDecisionDto input)
    {
        if (input == null) return BadRequest(new { succeeded = false, message = "Choose approve or reject." });
        if (CurrentUserId is not Guid userId) return Unauthorized();

        var result = await _repository.DecideStatusEditRequestAsync(id, input.Approve, userId, input.Comment);
        if (!result.Succeeded) return BadRequest(result);
        try
        {
            await _notificationService.AddStatusEditDecisionNotification(result.Request!, userId, input.Approve);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Status edit decision notification failed for request {RequestId}", id);
        }
        return Ok(result);
    }
}
