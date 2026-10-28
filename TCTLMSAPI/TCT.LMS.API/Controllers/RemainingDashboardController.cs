using Microsoft.AspNetCore.Authorization;using Microsoft.AspNetCore.Mvc;using TCT.LMS.Application.Interfaces.Repositories;using TCT.LMS.Application.Interfaces.Services;namespace TCT.LMS.API.Controllers;
[ApiController][Route("api/role-dashboard")]public sealed class RemainingDashboardController:ControllerBase{private readonly IRemainingDashboardService _s;public RemainingDashboardController(IRemainingDashboardService s)=>_s=s;
[Authorize(Roles="SuperAdmin,Admin,AccountsAdmin,Accounts,PayrollAdmin,Payroll")][HttpGet("finance/{name}")]public async Task<IActionResult> Finance(string name,DateTime? fromDate,DateTime? toDate,int take=100,CancellationToken token=default)=>Result(await _s.QueryAsync(name switch{"summary"=>RemainingDashboardQuery.FinanceSummary,"trend"=>RemainingDashboardQuery.FinanceTrend,"outstanding"=>RemainingDashboardQuery.OutstandingInvoices,"payment-modes"=>RemainingDashboardQuery.PaymentModes,_=>throw new ArgumentException("Unknown finance query.")},fromDate,toDate,take,token),name=="summary");
[Authorize(Roles="SuperAdmin,Admin,HRAdmin,HR")][HttpGet("hr/{name}")]public async Task<IActionResult> Hr(string name,DateTime? fromDate,DateTime? toDate,int take=100,CancellationToken token=default)=>Result(await _s.QueryAsync(name switch{"summary"=>RemainingDashboardQuery.HrSummary,"pipeline"=>RemainingDashboardQuery.TutorPipeline,"trend"=>RemainingDashboardQuery.TutorOnboardingTrend,"engagement"=>RemainingDashboardQuery.TutorEngagement,_=>throw new ArgumentException("Unknown HR query.")},fromDate,toDate,take,token),name=="summary");
private IActionResult Result(IReadOnlyList<IReadOnlyDictionary<string,object?>> r,bool single)
{
    if(single) return Ok(new{success=true,data=r.FirstOrDefault()});
    return Ok(new{success=true,data=r});
}}
