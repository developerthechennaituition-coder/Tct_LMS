using System.Security.Claims;
using TCT.LMS.Domain.Entities;

namespace TCT.LMS.API.Utilities
{
    public static class ClaimsExtensions
    {
        public static string GetUserId(this ClaimsPrincipal user)
        {
            var role = user.FindFirst(ClaimTypes.Role)?.Value;
            return user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        }
    }
}
