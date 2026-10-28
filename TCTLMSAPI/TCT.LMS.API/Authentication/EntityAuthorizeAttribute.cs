using Microsoft.AspNetCore.Authorization;

namespace TCT.LMS.API.Authentication;

public class EntityAuthorizeAttribute : AuthorizeAttribute
{
    public EntityAuthorizeAttribute(Type entityType, string action)
    {
        Policy = $"{entityType.Name}.{action}";
    }
}