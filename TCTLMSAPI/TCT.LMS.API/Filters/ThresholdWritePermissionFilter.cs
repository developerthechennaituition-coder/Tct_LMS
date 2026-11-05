using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using TCT.LMS.Data.Common;
using Rules = TCT.LMS.Application.Services.ThresholdWritePermissionRules;

namespace TCT.LMS.API.Filters;

/// <summary>
/// Threshold Configuration changes (POST / PUT / DELETE on ThresholdController) only for a signed-in user one of whose
/// active roles has the matching Add / Edit / Delete permission on the Threshold Configuration menu
/// (RoleMenuPermission, read from the database). Reads (GET) are not affected. Read-only.
/// </summary>
public sealed class ThresholdWritePermissionFilter : IAsyncActionFilter
{
    private readonly ApplicationDbContext _dbContext;

    public ThresholdWritePermissionFilter(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var required = Rules.RequiredPermission(context.HttpContext.Request.Method);
        if (required == Rules.Permission.None)
        {
            await next();
            return;
        }

        var callerId = GetCallerId(context.HttpContext.User);
        if (callerId == Guid.Empty || !await HasPermissionAsync(callerId, required))
        {
            context.Result = new ObjectResult(new { succeeded = false, message = Rules.ForbiddenMessage })
            {
                StatusCode = StatusCodes.Status403Forbidden
            };
            return;
        }

        await next();
    }

    private async Task<bool> HasPermissionAsync(Guid callerId, Rules.Permission required)
    {
        var permissions = await (from p in _dbContext.RoleMenuPermission.AsNoTracking()
                                 join m in _dbContext.Menu.AsNoTracking() on p.MenuId equals m.Id
                                 join ur in _dbContext.UserRole.AsNoTracking() on p.RoleId equals ur.RoleId
                                 join r in _dbContext.Roles.AsNoTracking() on (int?)ur.RoleId equals r.Id
                                 where ur.UserId == callerId && ur.IsActive && r.IsActive
                                       && p.IsActive && m.IsActive && m.Link == Rules.MenuLink
                                 select new { p.Add, p.Edit, p.Delete }).ToListAsync();
        return permissions.Any(p => Rules.Grants(required, p.Add, p.Edit, p.Delete));
    }

    // Same claims as TutorController.GetCallerId.
    private static Guid GetCallerId(System.Security.Claims.ClaimsPrincipal user) =>
        user.Claims
            .Where(claim => claim.Type.Equals("UserId", StringComparison.OrdinalIgnoreCase)
                || claim.Type == System.Security.Claims.ClaimTypes.NameIdentifier
                || claim.Type.EndsWith("/nameidentifier", StringComparison.OrdinalIgnoreCase)
                || claim.Type.Equals("sub", StringComparison.OrdinalIgnoreCase))
            .Select(claim => Guid.TryParse(claim.Value, out var id) ? id : Guid.Empty)
            .FirstOrDefault(id => id != Guid.Empty);
}
