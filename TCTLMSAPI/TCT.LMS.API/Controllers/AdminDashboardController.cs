using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using TCT.LMS.Application.Interfaces.Services;

namespace TCT.LMS.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AdminDashboardController : ControllerBase
    {
        private readonly IAdminDashboardService _adminDashboardService;
        public AdminDashboardController(IAdminDashboardService adminDashboardService)
        {
            _adminDashboardService = adminDashboardService;
        }

        [HttpGet("salesbyboard")]
        public IActionResult GetSalesByBoardId(int typeGroupCode)
        {
            var result = _adminDashboardService.GetSalesByBoard(typeGroupCode);
            return Ok(result);
        }

        [HttpGet("GetUserCountByRole")]
        public IActionResult GetUserCountByRole(int typeGroupCode)
        {
            var result = _adminDashboardService.GetUserCountByRole();
            return Ok(result);
        }
    }
}
