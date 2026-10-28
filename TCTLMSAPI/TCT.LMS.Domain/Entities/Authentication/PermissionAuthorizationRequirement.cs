using Microsoft.AspNetCore.Authorization;
using TCT.LMS.Domain.Authentication;

namespace TCT.Entities.Authentication;

public class PermissionAuthorizationRequirement : IAuthorizationRequirement
{
    public PermissionAuthorizationRequirement(Permissions permission)
    {
        Permissions = permission;
    }

    public Permissions Permissions { get; }
}
