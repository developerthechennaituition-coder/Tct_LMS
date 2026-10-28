using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using System.Security.Claims;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;

namespace TCT.LMS.API.Controllers;

[ApiController]
[Authorize(Roles = "SuperAdmin,Admin,Coordinator,CoordinatorAdmin")]
[Route("api/coordinator-dashboard/{coordinatorId:guid}")]
public sealed class CoordinatorDashboardController : ControllerBase, IActionFilter
{
    private readonly ICoordinatorDashboardService _service;
    public CoordinatorDashboardController(ICoordinatorDashboardService service) => _service = service;

    [NonAction]
    public void OnActionExecuting(ActionExecutingContext context)
    {
        if (User.IsInRole("Coordinator") &&
            context.ActionArguments.TryGetValue("coordinatorId", out var value) && value is Guid requestedId)
        {
            var signedInId = User.Claims
                .Where(claim => claim.Type.Equals("UserId", StringComparison.OrdinalIgnoreCase)
                    || claim.Type == ClaimTypes.NameIdentifier
                    || claim.Type.EndsWith("/nameidentifier", StringComparison.OrdinalIgnoreCase)
                    || claim.Type.Equals("sub", StringComparison.OrdinalIgnoreCase))
                .Select(claim => Guid.TryParse(claim.Value, out var id) ? id : Guid.Empty)
                .FirstOrDefault(id => id != Guid.Empty);
            if (signedInId == Guid.Empty || signedInId != requestedId)
            {
                context.Result = Forbid();
                return;
            }
        }

    }

    [NonAction]
    public void OnActionExecuted(ActionExecutedContext context) { }

    [HttpGet("summary")] public async Task<IActionResult> Summary(Guid coordinatorId, DateTime? fromDate, DateTime? toDate, CancellationToken token) => Single(await Q(CoordinatorDashboardQuery.Summary, coordinatorId, token, fromDate, toDate));
    [HttpGet("courses")] public async Task<IActionResult> Courses(Guid coordinatorId, int take=100, CancellationToken token=default) => List(await Q(CoordinatorDashboardQuery.Courses, coordinatorId, token, take:take));
    [HttpGet("students")] public async Task<IActionResult> Students(Guid coordinatorId, int take=100, CancellationToken token=default) => List(await Q(CoordinatorDashboardQuery.Students, coordinatorId, token, take:take));
    [HttpGet("demos/pipeline")] public async Task<IActionResult> DemoPipeline(Guid coordinatorId, DateTime? fromDate, DateTime? toDate, CancellationToken token) => List(await Q(CoordinatorDashboardQuery.DemoPipeline, coordinatorId, token, fromDate, toDate));
    [HttpGet("demos/conversions")] public async Task<IActionResult> DemoConversions(Guid coordinatorId, DateTime? fromDate, DateTime? toDate, CancellationToken token) => List(await Q(CoordinatorDashboardQuery.DemoConversions, coordinatorId, token, fromDate, toDate));
    [HttpGet("demos/inflow")] public async Task<IActionResult> InflowDetails(Guid coordinatorId, DateTime? fromDate, DateTime? toDate, int take=500, CancellationToken token=default) => List(await Q(CoordinatorDashboardQuery.InflowDetails, coordinatorId, token, fromDate, toDate, take));
    [HttpGet("tutors/workload")] public async Task<IActionResult> TutorWorkload(Guid coordinatorId, int take=100, CancellationToken token=default) => List(await Q(CoordinatorDashboardQuery.TutorWorkload, coordinatorId, token, take:take));
    [HttpGet("classes/progress")] public async Task<IActionResult> ClassProgress(Guid coordinatorId, DateTime? fromDate, DateTime? toDate, CancellationToken token) => List(await Q(CoordinatorDashboardQuery.ClassProgress, coordinatorId, token, fromDate, toDate));
    [HttpGet("alerts")] public async Task<IActionResult> Alerts(Guid coordinatorId, DateTime? fromDate, DateTime? toDate, int take=100, CancellationToken token=default) => List(await Q(CoordinatorDashboardQuery.Alerts, coordinatorId, token, fromDate, toDate, take));

    private Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> Q(CoordinatorDashboardQuery query, Guid id, CancellationToken token, DateTime? from=null, DateTime? to=null, int? take=null) => _service.QueryAsync(query,id,from,to,take,token);
    private IActionResult List(IReadOnlyList<IReadOnlyDictionary<string, object?>> rows) => Ok(new { success=true, data=rows });
    private IActionResult Single(IReadOnlyList<IReadOnlyDictionary<string, object?>> rows) => Ok(new { success=true, data=rows.FirstOrDefault() });
}

