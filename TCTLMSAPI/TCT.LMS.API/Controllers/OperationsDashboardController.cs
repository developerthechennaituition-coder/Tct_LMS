using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;

namespace TCT.LMS.API.Controllers;

[ApiController]
[Authorize(Roles = "SuperAdmin,Admin,OperationsAdmin,Operations")]
[Route("api/operations-dashboard")]
public sealed class OperationsDashboardController : ControllerBase
{
    private readonly IOperationsDashboardService _service;

    public OperationsDashboardController(IOperationsDashboardService service) => _service = service;

    [HttpGet("summary")]
    public async Task<IActionResult> Summary([FromQuery] DateTime? date, CancellationToken token)
        => Single(await Query(OperationsDashboardQuery.Summary, token, date));

    [HttpGet("classes/planned")]
    public async Task<IActionResult> PlannedClasses([FromQuery] DateTime? date,
        [FromQuery] int take = 100, CancellationToken token = default)
        => List(await Query(OperationsDashboardQuery.PlannedClasses, token, date, take: take));

    [HttpGet("classes/rescheduled")]
    public async Task<IActionResult> RescheduledClasses([FromQuery] DateTime? date,
        [FromQuery] int take = 100, CancellationToken token = default)
        => List(await Query(OperationsDashboardQuery.RescheduledClasses, token, date, take: take));

    [HttpGet("students/active")]
    public async Task<IActionResult> ActiveStudents([FromQuery] int take = 100,
        CancellationToken token = default)
        => List(await Query(OperationsDashboardQuery.ActiveStudents, token, take: take));

    [HttpGet("tutors/active")]
    public async Task<IActionResult> ActiveTutors([FromQuery] int take = 100,
        CancellationToken token = default)
        => List(await Query(OperationsDashboardQuery.ActiveTutors, token, take: take));

    [HttpGet("alerts/low-engagement")]
    public async Task<IActionResult> LowEngagement([FromQuery] int take = 100,
        CancellationToken token = default)
        => List(await Query(OperationsDashboardQuery.LowEngagementTutors, token, take: take));

    [HttpGet("alerts/cancellations")]
    public async Task<IActionResult> Cancellations([FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate, [FromQuery] int take = 100, CancellationToken token = default)
        => List(await Query(OperationsDashboardQuery.CancelledClasses, token,
            fromDate: fromDate, toDate: toDate, take: take));

    [HttpGet("alerts/missed-attendance")]
    public async Task<IActionResult> MissedAttendance([FromQuery] DateTime? date,
        [FromQuery] int take = 100, CancellationToken token = default)
        => List(await Query(OperationsDashboardQuery.MissedAttendance, token,
            date ?? DateTime.Today.AddDays(-1), take: take));

    [HttpGet("classes/daily-summary")]
    public async Task<IActionResult> DailyClassSummary([FromQuery] DateTime? date, CancellationToken token)
        => Single(await Query(OperationsDashboardQuery.DailyClassSummary, token,
            date ?? DateTime.Today.AddDays(-1)));

    [HttpGet("classes/time-wise")]
    public async Task<IActionResult> TimeWiseClasses([FromQuery] DateTime? date,
        [FromQuery] int take = 100, CancellationToken token = default)
        => List(await Query(OperationsDashboardQuery.TimeWiseClasses, token, date, take: take));

    [HttpGet("enrollments/by-course")]
    public async Task<IActionResult> EnrollmentByCourse(CancellationToken token)
        => List(await Query(OperationsDashboardQuery.EnrollmentByCourse, token));

    [HttpGet("enrollments/trend")]
    public async Task<IActionResult> EnrollmentTrend([FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate, CancellationToken token)
        => List(await Query(OperationsDashboardQuery.EnrollmentTrend, token,
            fromDate: fromDate, toDate: toDate));

    [HttpGet("classes/completion")]
    public async Task<IActionResult> DailyCompletion([FromQuery] DateTime? date, CancellationToken token)
        => Single(await Query(OperationsDashboardQuery.DailyCompletion, token,
            date ?? DateTime.Today.AddDays(-1)));

    [HttpGet("mismatch/student")]
    public async Task<IActionResult> StudentMismatch([FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate, [FromQuery] int take = 100, CancellationToken token = default)
        => List(await Query(OperationsDashboardQuery.StudentMismatch, token,
            fromDate: fromDate, toDate: toDate, take: take));

    [HttpGet("mismatch/operation")]
    public async Task<IActionResult> OperationMismatch([FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate, [FromQuery] int take = 100, CancellationToken token = default)
        => List(await Query(OperationsDashboardQuery.OperationMismatch, token,
            fromDate: fromDate, toDate: toDate, take: take));

    [HttpGet("mismatch/tutor")]
    public async Task<IActionResult> TutorMismatch([FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate, [FromQuery] int take = 100, CancellationToken token = default)
        => List(await Query(OperationsDashboardQuery.TutorMismatch, token,
            fromDate: fromDate, toDate: toDate, take: take));

    [HttpGet("classes/extra")]
    public async Task<IActionResult> ExtraClasses([FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate, [FromQuery] int take = 100, CancellationToken token = default)
        => List(await Query(OperationsDashboardQuery.ExtraClasses, token,
            fromDate: fromDate, toDate: toDate, take: take));

    private Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> Query(
        OperationsDashboardQuery query,
        CancellationToken token,
        DateTime? reportDate = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        int? take = null)
        => _service.QueryAsync(query, reportDate, fromDate, toDate, take, token);

    private IActionResult List(IReadOnlyList<IReadOnlyDictionary<string, object?>> rows)
        => Ok(new { success = true, data = rows });

    private IActionResult Single(IReadOnlyList<IReadOnlyDictionary<string, object?>> rows)
        => Ok(new { success = true, data = rows.FirstOrDefault() });
}
