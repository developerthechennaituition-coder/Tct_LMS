using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.DTOs.Schedule;

namespace TCT.LMS.API.Controllers;

// Schedule Calendar menu. Operations pick a tutor and one of the tutor's students and add class day(s) directly.
// Tutors pick one of their students and students one of their tutors; their additions become requests that
// Operations approve, and the classes are added only then. Everyone involved is notified.
[ApiController]
[Route("api/schedule-calendar")]
[Authorize]
public class ScheduleCalendarController : ControllerBase
{
    // Accounts Admin has the same Schedule Calendar as Operations.
    private const string EditorRoles = "Operations,OperationsAdmin,AccountsAdmin,SuperAdmin,Admin";
    private readonly IScheduleRepository _repository;
    private readonly INotificationService _notificationService;
    private readonly ILogger<ScheduleCalendarController> _logger;

    public ScheduleCalendarController(IScheduleRepository repository, INotificationService notificationService,
        ILogger<ScheduleCalendarController> logger)
    {
        _repository = repository;
        _notificationService = notificationService;
        _logger = logger;
    }

    private bool IsEditor => EditorRoles.Split(',').Any(User.IsInRole);

    // The "UserId" claim first: the JWT handler maps "sub" onto NameIdentifier, which is not a user id here.
    private Guid? CurrentUserId =>
        Guid.TryParse(User.FindFirst("UserId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id) && id != Guid.Empty
            ? id : null;

    // A tutor's or student's own enrolments; empty for any other role.
    private async Task<List<ScheduleCalendarEnrolmentDto>> OwnEnrolmentsAsync(Guid userId) =>
        User.IsInRole("Tutor") ? await _repository.GetScheduleCalendarEnrolmentsAsync(null, userId, null)
        : User.IsInRole("Student") ? await _repository.GetScheduleCalendarEnrolmentsAsync(null, null, userId)
        : new List<ScheduleCalendarEnrolmentDto>();

    [HttpGet("tutors")]
    [Authorize(Roles = EditorRoles)]
    public async Task<IActionResult> Tutors() => Ok(await _repository.GetScheduleCalendarTutorsAsync());

    // Operations: the given tutor's students. Tutor / Student: their own enrolments only.
    [HttpGet("enrolments")]
    public async Task<IActionResult> Enrolments([FromQuery] Guid? tutorId)
    {
        if (IsEditor)
            return tutorId.HasValue ? Ok(await _repository.GetScheduleCalendarEnrolmentsAsync(tutorId, null, null)) : Ok(new List<ScheduleCalendarEnrolmentDto>());
        if (CurrentUserId is not Guid userId) return Unauthorized();
        if (!User.IsInRole("Tutor") && !User.IsInRole("Student")) return Forbid();
        return Ok(await OwnEnrolmentsAsync(userId));
    }

    [HttpGet("events")]
    public async Task<IActionResult> Events([FromQuery] Guid salesDetailsId, [FromQuery] DateTime from, [FromQuery] DateTime to)
    {
        if (to < from || (to - from).TotalDays > 62) return BadRequest("Date range must be between 1 and 62 days.");
        if (!IsEditor)
        {
            if (CurrentUserId is not Guid userId) return Unauthorized();
            if ((await OwnEnrolmentsAsync(userId)).All(e => e.SalesDetailsId != salesDetailsId)) return Forbid();
        }
        return Ok(await _repository.GetScheduleCalendarEventsAsync(salesDetailsId, from, to));
    }

    [HttpPost("weekly-day-change")]
    public async Task<IActionResult> AddWeeklyDayChange([FromBody] WeeklyDayChangeRequestDto request)
    {
        if (request == null || request.SalesDetailsId == Guid.Empty) return BadRequest("Select a student first.");
        if (CurrentUserId is not Guid userId) return Unauthorized();
        if (!IsEditor && (await OwnEnrolmentsAsync(userId)).All(e => e.SalesDetailsId != request.SalesDetailsId)) return Forbid();

        // Tutors and students: the same checks run now, but the classes are added only when Operations approve.
        if (!IsEditor)
        {
            var check = await _repository.AddWeeklyDayChangeAsync(request, userId, dryRun: true);
            var requesterType = User.IsInRole("Tutor") ? "tutor" : "student";
            if (!check.Succeeded)
            {
                // Refused because the tutor and/or student is busy then: the error stays, and Operations are told.
                if (check.ClashStart.HasValue && check.ClashEnd.HasValue)
                {
                    try
                    {
                        await _notificationService.AddScheduleCalendarClashNotifications(request.SalesDetailsId, userId, requesterType,
                            check.TutorBusy, check.StudentBusy, check.ClashStart.Value, check.ClashEnd.Value);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Schedule calendar clash notification failed for SalesDetails {SalesDetailsId}", request.SalesDetailsId);
                    }
                }
                return BadRequest(check);
            }
            var created = await _repository.CreateScheduleChangeRequestAsync(request, userId, requesterType, check.Message);
            if (!created.Succeeded) return BadRequest(created);
            try
            {
                await _notificationService.AddScheduleChangeRequestNotifications(created.Request!, userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Schedule change request notification failed for SalesDetails {SalesDetailsId}", request.SalesDetailsId);
            }
            return Ok(new { succeeded = true, pendingApproval = true, message = created.Message, request = created.Request });
        }

        var result = await _repository.AddWeeklyDayChangeAsync(request, userId);
        if (!result.Succeeded) return BadRequest(result);

        // The classes are saved; a failed notification must not turn that into an error.
        var changedByRole = User.IsInRole("AccountsAdmin") ? "AccountsAdmin" : IsEditor ? "Operations" : User.IsInRole("Tutor") ? "Tutor" : "Student";
        try
        {
            await _notificationService.AddScheduleChangeNotifications(request.SalesDetailsId, userId, changedByRole, result.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Schedule change notification failed for SalesDetails {SalesDetailsId}", request.SalesDetailsId);
        }
        return Ok(result);
    }

    // Requests to add class day(s) for one enrolment. Tutors and students: their own enrolments only.
    [HttpGet("requests")]
    public async Task<IActionResult> Requests([FromQuery] Guid salesDetailsId)
    {
        if (!IsEditor)
        {
            if (CurrentUserId is not Guid userId) return Unauthorized();
            if ((await OwnEnrolmentsAsync(userId)).All(e => e.SalesDetailsId != salesDetailsId)) return Forbid();
        }
        return Ok(await _repository.GetScheduleChangeRequestsAsync(salesDetailsId));
    }

    // Requests tab: Operations see every request; tutors and students only those on their own enrolments.
    [HttpGet("requests/all")]
    public async Task<IActionResult> AllRequests([FromQuery] bool pendingOnly = false)
    {
        if (IsEditor) return Ok(await _repository.GetScheduleChangeRequestListAsync(null, pendingOnly));
        if (CurrentUserId is not Guid userId) return Unauthorized();
        var own = (await OwnEnrolmentsAsync(userId)).Select(e => e.SalesDetailsId).ToList();
        return Ok(await _repository.GetScheduleChangeRequestListAsync(own, pendingOnly));
    }

    // Operations approve (the classes are added now) or reject a tutor's or student's request.
    [HttpPost("requests/{id:guid}/decision")]
    [Authorize(Roles = EditorRoles)]
    public async Task<IActionResult> DecideRequest(Guid id, [FromBody] ScheduleChangeDecisionDto input)
    {
        if (input == null) return BadRequest(new { succeeded = false, message = "Choose approve or reject." });
        if (CurrentUserId is not Guid userId) return Unauthorized();

        var result = await _repository.DecideScheduleChangeRequestAsync(id, input.Approve, userId, input.Comment);
        if (!result.Succeeded) return BadRequest(result);
        try
        {
            await _notificationService.AddScheduleChangeDecisionNotifications(result.Request!, result.Request!.RequestedBy, userId, input.Approve);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Schedule change decision notification failed for request {RequestId}", id);
        }
        return Ok(result);
    }

    // Operations: the student dropdown (independent of the tutor dropdown).
    [HttpGet("students")]
    [Authorize(Roles = EditorRoles)]
    public async Task<IActionResult> Students() => Ok(await _repository.GetScheduleCalendarStudentsAsync());

    // Operations: one tutor's calendar (tutorId = Tutor.Id) or one student's calendar (studentId = Student.Id).
    [HttpGet("person-events")]
    [Authorize(Roles = EditorRoles)]
    public async Task<IActionResult> PersonEvents([FromQuery] Guid? tutorId, [FromQuery] Guid? studentId,
        [FromQuery] DateTime from, [FromQuery] DateTime to)
    {
        if (to < from || (to - from).TotalDays > 62) return BadRequest("Date range must be between 1 and 62 days.");
        if (tutorId.HasValue == studentId.HasValue) return BadRequest("Choose either a tutor or a student.");
        return Ok(await _repository.GetScheduleCalendarPersonEventsAsync(tutorId, studentId, from, to));
    }

    // Operations change a tutor's/student's request, then approve it (classes are added with the new values).
    [HttpPost("requests/{id:guid}/modify")]
    [Authorize(Roles = EditorRoles)]
    public async Task<IActionResult> ModifyRequest(Guid id, [FromBody] WeeklyDayChangeRequestDto change)
    {
        if (change == null || change.SalesDetailsId == Guid.Empty) return BadRequest(new { succeeded = false, message = "Enter the changes." });
        if (CurrentUserId is not Guid userId) return Unauthorized();

        var result = await _repository.ModifyAndApproveScheduleChangeRequestAsync(id, change, userId, null);
        if (!result.Succeeded) return BadRequest(result);
        try
        {
            await _notificationService.AddScheduleChangeDecisionNotifications(result.Request!, result.Request!.RequestedBy, userId, true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Schedule change decision notification failed for request {RequestId}", id);
        }
        return Ok(result);
    }
}
