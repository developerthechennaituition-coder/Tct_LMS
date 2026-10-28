using Microsoft.AspNetCore.Authorization; using Microsoft.AspNetCore.Mvc; using TCT.LMS.Application.Interfaces.Repositories; using TCT.LMS.Application.Interfaces.Services;
namespace TCT.LMS.API.Controllers;
[ApiController][Authorize(Roles="SuperAdmin,Admin,CoordinatorAdmin")][Route("api/coordinator-admin-dashboard")]
public sealed class CoordinatorAdminDashboardController:ControllerBase
{
 private readonly ICoordinatorAdminDashboardService _service; public CoordinatorAdminDashboardController(ICoordinatorAdminDashboardService service)=>_service=service;
 [HttpGet("summary")]public async Task<IActionResult> Summary(DateTime? fromDate,DateTime? toDate,CancellationToken token)=>Single(await Q(CoordinatorAdminDashboardQuery.Summary,token,fromDate,toDate));
 [HttpGet("coordinators")]public async Task<IActionResult> Coordinators(DateTime? fromDate,DateTime? toDate,int take=100,CancellationToken token=default)=>List(await Q(CoordinatorAdminDashboardQuery.Coordinators,token,fromDate,toDate,take));
 [HttpGet("approvals/pending")]public async Task<IActionResult> PendingApprovals(int take=100,CancellationToken token=default)=>List(await Q(CoordinatorAdminDashboardQuery.PendingApprovals,token,take:take));
 [HttpGet("demos/pipeline")]public async Task<IActionResult> DemoPipeline(DateTime? fromDate,DateTime? toDate,CancellationToken token)=>List(await Q(CoordinatorAdminDashboardQuery.DemoPipeline,token,fromDate,toDate));
 private Task<IReadOnlyList<IReadOnlyDictionary<string,object?>>> Q(CoordinatorAdminDashboardQuery q,CancellationToken t,DateTime? f=null,DateTime? to=null,int? take=null)=>_service.QueryAsync(q,f,to,take,t);
 private IActionResult List(IReadOnlyList<IReadOnlyDictionary<string,object?>> r)=>Ok(new{success=true,data=r});private IActionResult Single(IReadOnlyList<IReadOnlyDictionary<string,object?>> r)=>Ok(new{success=true,data=r.FirstOrDefault()});
}
