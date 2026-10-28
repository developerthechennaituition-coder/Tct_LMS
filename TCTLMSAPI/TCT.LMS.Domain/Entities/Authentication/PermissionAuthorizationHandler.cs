using Microsoft.AspNetCore.Authorization;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Domain.Authentication;

namespace TCT.Entities.Authentication;

public class PermissionAuthorizationHandler : AuthorizationHandler<PermissionAuthorizationRequirement>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, PermissionAuthorizationRequirement requirement)
    {
        var permissionClaim = context.User.FindFirst(
            c => c.Type == CustomClaimTypes.Permissions);

        if (permissionClaim == null)
        {
            return Task.CompletedTask;
        }

        if (!int.TryParse(permissionClaim.Value, out int permissionClaimValue))
        {
            return Task.CompletedTask;
        }

        var userPermissions = (Permissions)permissionClaimValue;

        if ((userPermissions & requirement.Permissions) != 0)
        {
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        foreach (var r in context.Requirements)
        {
            if(r is PermissionAuthorizationRequirement && r != requirement)
            {
                PermissionAuthorizationRequirement permissionAuthorizationRequirement = (PermissionAuthorizationRequirement)r;
                if ((userPermissions & permissionAuthorizationRequirement.Permissions) != 0)
                {
                    context.Succeed(requirement);
                    return Task.CompletedTask;
                }
            }
        }

        return Task.CompletedTask;
    }
}
