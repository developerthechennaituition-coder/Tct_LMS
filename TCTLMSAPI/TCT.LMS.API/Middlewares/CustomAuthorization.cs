using Microsoft.AspNetCore.Http;
using System.Security.Claims;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Application.Services;
using TCT.LMS.DTOs.User;

namespace TCT.LMS.Infrastructure.Middlewares;

public class CustomAuthorization
{
    private readonly RequestDelegate _next;

    public CustomAuthorization(RequestDelegate next)
    {
        _next = next;
    }

    public async Task Invoke(HttpContext context, IAuthService authService)
    {
        var userId = context.User.FindFirst("UserId")?.Value;

        if (!string.IsNullOrWhiteSpace(userId))
        {
            List<UserRolesPermissionResponseDto> userPermissions = await authService.GetUserRolePermissionClaims(Guid.Parse(userId));
            var claims = new List<Claim>();

            if (userPermissions != null)
            {
                var roles = userPermissions[0].Roles;
                var permissions = userPermissions[0].Permissions;

                foreach(var role in roles)
                {
                    claims.Add(new Claim(ClaimTypes.Role, role.RoleName));
                }
                foreach (var permission in permissions)
                {
                    var permissionProperties = new Dictionary<string, bool>
                    {
                        { "View", permission.View },
                        { "Add", permission.Add },
                        { "Edit", permission.Edit },
                        { "Delete", permission.Delete },
                        { "Report", permission.Report },
                    };
                    foreach (var property in permissionProperties)
                    {
                        switch (property.Key)
                        {
                            case "View":
                                if (property.Value)
                                {
                                    claims.Add(new Claim("Permission", $"{permission.Name}.View"));
                                }
                                break;

                            case "Add":
                                if (property.Value)
                                {
                                    claims.Add(new Claim("Permission", $"{permission.Name}.Add"));
                                }
                                break;

                            case "Edit":
                                if (property.Value)
                                {
                                    claims.Add(new Claim("Permission", $"{permission.Name}.Edit"));
                                }
                                break;

                            case "Delete":
                                if (property.Value)
                                {
                                    claims.Add(new Claim("Permission", $"{permission.Name}.Delete"));
                                }
                                break;
                            case "Report":
                                if (property.Value)
                                {
                                    claims.Add(new Claim("Permission", $"{permission.Name}.Report"));
                                }
                                break;
                            default:
                                break;
                        }
                    }
                }
                var claimsIdentity = new ClaimsIdentity(claims, "Custom");
                context.User.AddIdentity(claimsIdentity);
            }
        }

        await _next(context);
    }
}

