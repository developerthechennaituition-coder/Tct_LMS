using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;

namespace TCT.LMS.API.Controllers;

[ApiController]
[Authorize(Roles = "Tutor")]
[Route("api/tutor-dashboard")]
public sealed class TutorDashboardController : ControllerBase
{
    private readonly ITutorDashboardService _service;

    public TutorDashboardController(ITutorDashboardService service) => _service = service;

    [HttpGet("current-tutor")]
    public async Task<IActionResult> CurrentTutor([FromQuery] Guid userId, CancellationToken token)
    {
        if (userId == Guid.Empty) return BadRequest(new { message = "userId is required." });
        var authenticatedUserId = AuthenticatedUserId();
        if (authenticatedUserId == Guid.Empty)
            return Unauthorized(new { message = "The access token does not contain a valid user ID." });
        if (userId != authenticatedUserId) return Forbid();

        return Ok(new { success = true, data = new { tutorId = await _service.GetTutorIdAsync(userId, token) } });
    }

    [HttpGet("{tutorId:guid}/profile")]
    public async Task<IActionResult> Profile(Guid tutorId, CancellationToken token)
        => Single(await Query(TutorDashboardQuery.Profile, tutorId, token));

    [HttpGet("{tutorId:guid}/demo-videos")]
    public async Task<IActionResult> DemoVideos(Guid tutorId, CancellationToken token)
        => List(await Query(TutorDashboardQuery.DemoVideos, tutorId, token));

    [HttpGet("{tutorId:guid}/subjects")]
    public async Task<IActionResult> Subjects(Guid tutorId, CancellationToken token)
        => List(await Query(TutorDashboardQuery.Subjects, tutorId, token));

    [HttpGet("{tutorId:guid}/schedule")]
    public async Task<IActionResult> Schedule(Guid tutorId, [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate, CancellationToken token)
        => List(await Query(TutorDashboardQuery.Schedule, tutorId, token,
            fromDate ?? DateTime.Today, toDate ?? DateTime.Today.AddMonths(1)));

    [HttpGet("{tutorId:guid}/history/demos")]
    public async Task<IActionResult> DemoHistory(Guid tutorId, CancellationToken token)
        => List(await Query(TutorDashboardQuery.DemoHistory, tutorId, token));

    [HttpGet("{tutorId:guid}/history/allocations")]
    public async Task<IActionResult> AllocationHistory(Guid tutorId, CancellationToken token)
        => List(await Query(TutorDashboardQuery.AllocationHistory, tutorId, token));

    [HttpGet("{tutorId:guid}/students")]
    public async Task<IActionResult> CurrentStudents(Guid tutorId, CancellationToken token)
        => List(await Query(TutorDashboardQuery.CurrentStudents, tutorId, token));

    [HttpGet("{tutorId:guid}/availability")]
    public async Task<IActionResult> Availability(Guid tutorId, CancellationToken token)
        => List(await Query(TutorDashboardQuery.Availability, tutorId, token));

    [HttpGet("{tutorId:guid}/ratings")]
    public async Task<IActionResult> Ratings(Guid tutorId, CancellationToken token)
        => List(await Query(TutorDashboardQuery.Ratings, tutorId, token));

    [HttpGet("{tutorId:guid}/hours/monthly")]
    public async Task<IActionResult> MonthlyHours(Guid tutorId, [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate, CancellationToken token)
        => List(await Query(TutorDashboardQuery.MonthlyHours, tutorId, token,
            fromDate ?? DateTime.Today.AddMonths(-11), toDate ?? DateTime.Today));

    [HttpGet("{tutorId:guid}/cancellations/monthly")]
    public async Task<IActionResult> CancellationHistory(Guid tutorId, CancellationToken token)
        => List(await Query(TutorDashboardQuery.CancellationHistory, tutorId, token));

    [HttpGet("{tutorId:guid}/homework")]
    public async Task<IActionResult> Homework(Guid tutorId, [FromQuery] int take = 100,
        CancellationToken token = default)
        => List(await Query(TutorDashboardQuery.Homework, tutorId, token, take: take));

    [HttpGet("{tutorId:guid}/summary")]
    public async Task<IActionResult> Summary(Guid tutorId, CancellationToken token)
        => Single(await Query(TutorDashboardQuery.Summary, tutorId, token));

    private Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> Query(
        TutorDashboardQuery query, Guid tutorId, CancellationToken token,
        DateTime? fromDate = null, DateTime? toDate = null, int? take = null)
        => _service.QueryAsync(query, tutorId, AuthenticatedUserId(), fromDate, toDate, take, token);

    private Guid AuthenticatedUserId()
    {
        var value = User.Claims
            .FirstOrDefault(claim => claim.Type.Equals("UserId", StringComparison.OrdinalIgnoreCase))?.Value
            ?? User.Claims.FirstOrDefault(claim =>
                claim.Type.Equals(ClaimTypes.NameIdentifier, StringComparison.OrdinalIgnoreCase)
                || claim.Type.EndsWith("/nameidentifier", StringComparison.OrdinalIgnoreCase))?.Value;

        return Guid.TryParse(value, out var userId) ? userId : Guid.Empty;
    }

    private IActionResult List(IReadOnlyList<IReadOnlyDictionary<string, object?>> rows)
        => Ok(new { success = true, data = rows });

    private IActionResult Single(IReadOnlyList<IReadOnlyDictionary<string, object?>> rows)
        => Ok(new { success = true, data = rows.FirstOrDefault() });
}
