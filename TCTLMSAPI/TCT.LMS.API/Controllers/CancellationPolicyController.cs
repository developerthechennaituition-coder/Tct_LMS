using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using TCT.LMS.API.Utilities;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Application.Services;
using TCT.LMS.Domain.Entities;

namespace TCT.LMS.API.Controllers
{
    [Authorize]
    [Route("api/tct/classcancellationpolicy")]
    [ApiController]
    public class CancellationPolicyController : ControllerBase
    {
        private readonly ICancellationPolicyService _cancellationPolicyService;
        public CancellationPolicyController(ICancellationPolicyService cancellationPolicyService)
        {
            _cancellationPolicyService = cancellationPolicyService;
        }

        [HttpGet("validate")]
        public async Task<IActionResult> GetCancellationPolicy(Guid salesDetailisId, CancellationToken cancellationToken)
        {
            var currentUser = User.GetUserId();
            var result = await _cancellationPolicyService.ValidateTutorCancellationAsync(salesDetailisId, cancellationToken);
            return Ok(result);
        }
    }
}
