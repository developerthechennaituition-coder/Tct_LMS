using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TCT.LMS.Application.Interfaces.Services;

namespace TCT.LMS.API.Controllers;

/// <summary>
/// Read-only data for the Reports menu. Requires an authenticated user whose role has the report's
/// saved Role Permission (Settings -> Role Permission -> Reports); one report's permission never
/// authorizes another, and no role is authorized without a saved permission.
/// </summary>
[ApiController]
[Authorize]
[Route("api/operations-reports")]
public sealed class OperationsReportsController : ControllerBase
{
    private readonly IOperationsReportsService _service;

    public OperationsReportsController(IOperationsReportsService service) => _service = service;

    // The signed-in role comes from the JWT role claim (the role chosen at login).
    private async Task<bool> CanViewAsync(string? report, CancellationToken token)
    {
        foreach (var role in User.FindAll(ClaimTypes.Role).Select(c => c.Value).Where(r => !string.IsNullOrWhiteSpace(r)).Distinct())
        {
            if (await _service.HasReportPermissionAsync(role, report, token)) return true;
        }
        return false;
    }

    private IActionResult NoReportPermission()
        => StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = "You do not have permission to view this report." });

    [HttpGet("filters")]
    public async Task<IActionResult> Filters(CancellationToken token)
    {
        if (!await CanViewAsync(null, token)) return NoReportPermission();
        return Ok(new { success = true, data = await _service.GetFilterOptionsAsync(token) });
    }

    [HttpGet("{report}/summary")]
    public async Task<IActionResult> Summary(string report, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate,
        [FromQuery] string? search, [FromQuery] Guid? tutorId, [FromQuery] Guid? studentId, [FromQuery] Guid? subjectId,
        CancellationToken token)
    {
        if (!await CanViewAsync(report, token)) return NoReportPermission();
        try
        {
            var data = await _service.GetSummaryAsync(report, fromDate, toDate, search, tutorId, studentId, subjectId, token);
            return Ok(new { success = true, data });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("{report}/{view}")]
    public async Task<IActionResult> Report(string report, string view, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate,
        [FromQuery] string? search, [FromQuery] Guid? tutorId, [FromQuery] Guid? studentId, [FromQuery] Guid? subjectId,
        [FromQuery] string? status, [FromQuery] string? groupBy, [FromQuery] string? sortBy, [FromQuery] string? sortDirection,
        [FromQuery] int? page, [FromQuery] int? pageSize, CancellationToken token)
    {
        if (!await CanViewAsync(report, token)) return NoReportPermission();
        try
        {
            var result = await _service.GetPageAsync(report, view, fromDate, toDate, search, tutorId, studentId, subjectId,
                status, groupBy, sortBy, sortDirection, page, pageSize, token);
            return Ok(new { success = true, data = result.Rows, totalRecords = result.TotalRows, page = result.Page, pageSize = result.PageSize });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}
