using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;

namespace TCT.LMS.API.Controllers;

[ApiController]
[Authorize(Roles = "SuperAdmin,Admin,SalesAdmin")]
[Route("api/super-admin-dashboard")]
public sealed class SuperAdminDashboardController : ControllerBase
{
    private readonly ISuperAdminDashboardService _service;

    public SuperAdminDashboardController(ISuperAdminDashboardService service) => _service = service;

    [HttpGet("summary")]
    public async Task<IActionResult> Summary([FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate, CancellationToken token)
        => Single(await Query(SuperAdminDashboardQuery.Summary, token, fromDate, toDate));

    [HttpGet("boards")]
    public async Task<IActionResult> Boards([FromQuery] int take = 100, CancellationToken token = default)
        => List(await Query(SuperAdminDashboardQuery.Boards, token, take: take));

    [HttpGet("students/active")]
    public async Task<IActionResult> ActiveStudents([FromQuery] int take = 100, CancellationToken token = default)
        => List(await Query(SuperAdminDashboardQuery.ActiveStudents, token, take: take));

    [HttpGet("tutors/active")]
    public async Task<IActionResult> ActiveTutors([FromQuery] int take = 100, CancellationToken token = default)
        => List(await Query(SuperAdminDashboardQuery.ActiveTutors, token, take: take));

    [HttpGet("courses/completion")]
    public async Task<IActionResult> CourseCompletion([FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate, CancellationToken token)
        => List(await Query(SuperAdminDashboardQuery.CourseCompletion, token, fromDate, toDate));

    [HttpGet("attendance")]
    public async Task<IActionResult> Attendance([FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate, CancellationToken token)
        => List(await Query(SuperAdminDashboardQuery.Attendance, token, fromDate, toDate));

    [HttpGet("resources/utilization")]
    public async Task<IActionResult> ResourceUtilization([FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate,
        [FromQuery] int take = 100, CancellationToken token = default)
        => List(await Query(SuperAdminDashboardQuery.ResourceUtilization, token, fromDate, toDate, take));

    [HttpGet("users/latest")]
    public async Task<IActionResult> LatestUsers([FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate,
        [FromQuery] int take = 100, CancellationToken token = default)
        => List(await Query(SuperAdminDashboardQuery.LatestUsers, token, fromDate, toDate, take));

    private Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> Query(
        SuperAdminDashboardQuery query, CancellationToken token, DateTime? fromDate = null,
        DateTime? toDate = null, int? take = null)
        => _service.QueryAsync(query, fromDate, toDate, take, token);

    private IActionResult List(IReadOnlyList<IReadOnlyDictionary<string, object?>> rows)
        => Ok(new { success = true, data = rows });

    private IActionResult Single(IReadOnlyList<IReadOnlyDictionary<string, object?>> rows)
        => Ok(new { success = true, data = rows.FirstOrDefault() });
}
