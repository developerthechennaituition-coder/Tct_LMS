using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using TCT.LMS.Data.Common;
using Rules = TCT.LMS.Application.Services.PaySlipAccessRules;
using Roles = TCT.LMS.Application.Services.ClassActionAuthorizationRules;

namespace TCT.LMS.API.Filters;

/// <summary>
/// Pay slip access (PaySlipAccessRules) for the actions taking an "invoiceNumber": a Tutor may open only their own pay
/// slips, a Student none; staff are passed through unchanged. Read-only.
/// </summary>
public sealed class PaySlipAccessFilter : IAsyncActionFilter
{
    private readonly ApplicationDbContext _dbContext;

    public PaySlipAccessFilter(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var user = context.HttpContext.User;
        var roles = user.Claims.Where(c => c.Type == ClaimTypes.Role || c.Type.Equals("role", StringComparison.OrdinalIgnoreCase))
            .Select(c => c.Value).Distinct().ToList();
        var restricted = Roles.RestrictedAs(roles);
        if (restricted != null)
        {
            var callerId = Guid.TryParse(user.FindFirst("UserId")?.Value ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id) ? id : Guid.Empty;
            var invoiceNumber = context.ActionArguments.TryGetValue("invoiceNumber", out var value) ? value as string : null;
            // TutorInvoice.TutorId holds the Tutor.Id, or the tutor's User.Id on older pay slips.
            var tutorKey = string.IsNullOrWhiteSpace(invoiceNumber) ? null
                : await _dbContext.TutorInvoice.AsNoTracking().Where(i => i.InvoiceNumber == invoiceNumber).Select(i => (Guid?)i.TutorId).FirstOrDefaultAsync();
            var tutorUserId = tutorKey == null ? null
                : await _dbContext.Tutor.AsNoTracking().Where(t => t.Id == tutorKey || t.UserId == tutorKey).Select(t => (Guid?)t.UserId).FirstOrDefaultAsync() ?? tutorKey;
            var error = Rules.Check(restricted, callerId, tutorUserId);
            if (error != null)
            {
                context.Result = new ObjectResult(new { succeeded = false, message = error }) { StatusCode = StatusCodes.Status403Forbidden };
                return;
            }
        }
        await next();
    }
}
