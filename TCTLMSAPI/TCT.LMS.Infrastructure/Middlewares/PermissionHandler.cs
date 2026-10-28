using Microsoft.AspNetCore.Authorization;
using System.Text.Json;
using TCT.LMS.DTOs.User;

namespace TCT.LMS.Infrastructure.Authorization;

public class PermissionHandler : AuthorizationHandler<PermissionRequirement>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, PermissionRequirement requirement)
    {
        var userPermissionsJson = context.User.FindFirst("Permissions")?.Value;
        if (userPermissionsJson != null)
        {
            var permissions = JsonSerializer.Deserialize<List<MenuResponseDto>>(userPermissionsJson);
            var requiredPermission = requirement.Permission.Split('.');
            var resource = requiredPermission[0];
            var action = requiredPermission[1].ToLower();

            var resourcePermission = permissions.FirstOrDefault(p => p.Name.Equals(resource, StringComparison.OrdinalIgnoreCase));
            if (resourcePermission != null)
            {
                bool hasPermission = action switch
                {
                    "view" => resourcePermission.View,
                    "add" => resourcePermission.Add,
                    "edit" => resourcePermission.Edit,
                    "delete" => resourcePermission.Delete,
                    _ => false
                };

                if (hasPermission)
                {
                    context.Succeed(requirement);
                }
            }
        }
        return Task.CompletedTask;
    }
}