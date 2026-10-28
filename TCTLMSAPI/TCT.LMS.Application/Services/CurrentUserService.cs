using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.DTOs.User;

namespace TCT.LMS.Application.Services
{
    public class CurrentUserService : ICurrentUserService
    {
        private readonly IHttpContextAccessor _context;
        public CurrentUserService(IHttpContextAccessor context)
        {
            _context = context;
        }

        public CurrentUser GetUser()
        {
            var user = _context.HttpContext?.User;

            return new CurrentUser
            {
                UserId = user?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                         ?? user?.FindFirst("UserId")?.Value,
                Email = user?.FindFirst(ClaimTypes.Email)?.Value,
                Name = user?.FindFirst(ClaimTypes.Name)?.Value,
                Role = user?.FindFirst(ClaimTypes.Role)?.Value,
                Roles = user?.FindAll(ClaimTypes.Role)
                            .Select(x => x.Value)
                            .ToList()
            };
        }
    }
}
