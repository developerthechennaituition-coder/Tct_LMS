using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;

namespace TCT.LMS.API.Controllers;

[ApiController]
[Authorize(Roles = "Student")]
[Route("api/student-dashboard")]
public sealed class StudentDashboardController : ControllerBase
{
    private readonly IStudentDashboardService _service;
    public StudentDashboardController(IStudentDashboardService service) => _service = service;

    [HttpGet("current-student")]
    public async Task<IActionResult> CurrentStudent([FromQuery] Guid userId, CancellationToken token)
    {
        if (userId == Guid.Empty) return BadRequest(new { message = "userId is required." });
        var authenticatedUserId = AuthenticatedUserId();
        if (authenticatedUserId == Guid.Empty)
            return Unauthorized(new { message = "The access token does not contain a valid user ID." });
        if (userId != authenticatedUserId)
            return Forbid();
        return Ok(new { success = true, data = new { studentId = await _service.GetStudentIdAsync(userId, token) } });
    }

    [HttpGet("{studentId:guid}/profile")]
    public async Task<IActionResult> Profile(Guid studentId, CancellationToken token)
        => Single(await Query(StudentDashboardQuery.Profile, studentId, token));

    [HttpGet("{studentId:guid}/courses")]
    public async Task<IActionResult> Courses(Guid studentId, CancellationToken token)
        => List(await Query(StudentDashboardQuery.Courses, studentId, token));

    [HttpGet("{studentId:guid}/upcoming-classes")]
    public async Task<IActionResult> UpcomingClasses(Guid studentId, [FromQuery] int take = 100, CancellationToken token = default)
        => List(await Query(StudentDashboardQuery.UpcomingClasses, studentId, token, take: take));

    [HttpGet("{studentId:guid}/attendance")]
    public async Task<IActionResult> Attendance(Guid studentId, [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate, CancellationToken token)
        => List(await Query(StudentDashboardQuery.Attendance, studentId, token,
            fromDate ?? DateTime.Today.AddMonths(-3), toDate ?? DateTime.Today));

    [HttpGet("{studentId:guid}/attendance/monthly")]
    public async Task<IActionResult> MonthlyAttendance(Guid studentId, CancellationToken token)
        => List(await Query(StudentDashboardQuery.MonthlyAttendance, studentId, token));

    [HttpGet("{studentId:guid}/tutors")]
    public async Task<IActionResult> Tutors(Guid studentId, CancellationToken token)
        => List(await Query(StudentDashboardQuery.Tutors, studentId, token));

    [HttpGet("{studentId:guid}/ratings")]
    public async Task<IActionResult> Ratings(Guid studentId, CancellationToken token)
        => List(await Query(StudentDashboardQuery.Ratings, studentId, token));

    [HttpGet("{studentId:guid}/notifications")]
    public async Task<IActionResult> Notifications(Guid studentId, [FromQuery] int take = 100, CancellationToken token = default)
        => List(await Query(StudentDashboardQuery.Notifications, studentId, token, take: take));

    [HttpGet("{studentId:guid}/notifications/unread-count")]
    public async Task<IActionResult> UnreadNotifications(Guid studentId, CancellationToken token)
        => Single(await Query(StudentDashboardQuery.UnreadNotificationCount, studentId, token));

    [HttpGet("{studentId:guid}/messages/summary")]
    public async Task<IActionResult> MessageSummary(Guid studentId, CancellationToken token)
        => Single(await Query(StudentDashboardQuery.MessageSummary, studentId, token));

    [HttpGet("{studentId:guid}/messages/conversations")]
    public async Task<IActionResult> Conversations(Guid studentId, CancellationToken token)
        => List(await Query(StudentDashboardQuery.Conversations, studentId, token));

    [HttpGet("{studentId:guid}/feedback")]
    public async Task<IActionResult> Feedback(Guid studentId, CancellationToken token)
        => List(await Query(StudentDashboardQuery.Feedback, studentId, token));

    [HttpGet("{studentId:guid}/summary")]
    public async Task<IActionResult> Summary(Guid studentId, CancellationToken token)
        => Single(await Query(StudentDashboardQuery.Summary, studentId, token));

    private Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> Query(
        StudentDashboardQuery query,
        Guid studentId,
        CancellationToken token,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        int? take = null)
        => _service.QueryAsync(query, studentId, AuthenticatedUserId(), fromDate, toDate, take, token);

    private Guid AuthenticatedUserId()
    {
        var value = User.Claims
            .FirstOrDefault(claim =>
                claim.Type.Equals("UserId", StringComparison.OrdinalIgnoreCase))?.Value
            ?? User.Claims
                .FirstOrDefault(claim =>
                    claim.Type.Equals(ClaimTypes.NameIdentifier, StringComparison.OrdinalIgnoreCase)
                    || claim.Type.EndsWith("/nameidentifier", StringComparison.OrdinalIgnoreCase))?.Value;
        return Guid.TryParse(value, out var userId) ? userId : Guid.Empty;
    }

    private IActionResult List(IReadOnlyList<IReadOnlyDictionary<string, object?>> rows)
        => Ok(new { success = true, data = rows });

    private IActionResult Single(IReadOnlyList<IReadOnlyDictionary<string, object?>> rows)
        => Ok(new { success = true, data = rows.FirstOrDefault() });
}
