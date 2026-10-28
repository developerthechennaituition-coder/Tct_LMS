using Microsoft.AspNetCore.Mvc;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Application.Services;
using TCT.LMS.DTOs.Dashboard;

namespace TCT.LMS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DashboardController : ControllerBase
    {
        private readonly IDashboardService _dashboardService;
        private readonly IMasterDetailService _lookupService;

        public DashboardController(IDashboardService dashboardService, IMasterDetailService service)
        {
            _dashboardService = dashboardService;
            _lookupService = service;
        }

        [HttpGet("accountsDashboardSummary")]
        public async Task<IActionResult> GetAccountsSummaryAsync([FromQuery] Guid userId)
        {
            if (userId == Guid.Empty)
                return BadRequest("Invalid user ID.");

            var result = await _dashboardService.GetAccountsSummaryAsync(userId);
            return Ok(result);
        }

        [HttpGet("studentAccountStatus")]
        public async Task<IActionResult> GetStudentAccountStatus()
        {
            var result = await _dashboardService.GetStudentAccountStatusAsync();
            return Ok(result);
        }

        [HttpGet("getStudentScheduleSummaryById")]
        public async Task<IActionResult> StudentScheduleSummaryById([FromQuery] Guid studentId,
            [FromQuery] string month = null,
            [FromQuery] int? year = null)
        {
            var result = await _dashboardService.GetStudentScheduleSummaryById(studentId, month, year);
            return Ok(result);
        }

        [HttpGet("tutorAccountStatus")]
        public async Task<IActionResult> GetTutorAccountStatus()
        {
            try
            {
                var result = await _dashboardService.GetTutorAccountStatusAsync();
                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (Exception ex)
            {
                // Log error (you can use ILogger here)
                //_logger.LogError(ex, "Error fetching tutor account status");

                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    success = false,
                    message = "Something went wrong while fetching tutor account status."
                });
            }
        }

        [HttpGet("getTutorScheduleSummaryById")]
        public async Task<IActionResult> TutorScheduleSummaryById([FromQuery] Guid tutorId,
            [FromQuery] string month = null,
            [FromQuery] int? year = null)
        {
            try
            {
                var result = await _dashboardService.GetTutorScheduleSummaryById(tutorId, month, year);
                return Ok(new
                {
                    success = true,
                    data = result
                });

            }
            catch (Exception ex)
            {
                // Log error (you can use ILogger here)
                //_logger.LogError(ex, "Error fetching tutor account status");

                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    success = false,
                    message = "Something went wrong while fetching tutor account status."
                });
            }
        }

        [HttpPost("submitTctLearningExperienceFeedback")]
        public async Task<IActionResult> SubmitTctLearningExperienceFeedback(
            [FromBody] TctLearningExperienceFeedbackDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            await _dashboardService.SubmitFeedbackAsync(dto);

            return Ok(new { success = true, message = "Feedback submitted successfully" });
        }

        [HttpPost("submitTutorDailyFeedback")]
        public async Task<IActionResult> SubmitTutorDailyFeedback(
            [FromBody] TctTutorDailyFeedbackDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            await _dashboardService.SubmitTutorDailyFeedbackAsync(dto);

            return Ok(new { success = true, message = "Feedback submitted successfully" });
        }

        [HttpGet("hasStudentFeedbackToday")]
        public async Task<IActionResult> HasStudentFeedbackToday([FromQuery] Guid userId)
        {
            if (userId == Guid.Empty)
                return BadRequest("Invalid user ID.");

            var result = await _dashboardService.HasStudentFeedbackTodayAsync(userId);
            return Ok(new { hasSubmitted = result });
        }

        [HttpGet("hasTutorFeedbackToday")]
        public async Task<IActionResult> HasTutorFeedbackToday([FromQuery] Guid userId)
        {
            if (userId == Guid.Empty)
                return BadRequest("Invalid user ID.");

            var result = await _dashboardService.HasTutorFeedbackTodayAsync(userId);
            return Ok(new { hasSubmitted = result });
        }

        [HttpGet("hasStudentCompletedFirstClass")]
        public async Task<IActionResult> HasStudentCompletedFirstClass([FromQuery] Guid userId)
        {
            if (userId == Guid.Empty)
                return BadRequest("Invalid user ID.");

            var result = await _dashboardService.HasStudentCompletedFirstClassAsync(userId);
            return Ok(new { hasCompletedFirstClass = result });
        }

        [HttpGet("hasTutorCompletedFirstClass")]
        public async Task<IActionResult> HasTutorCompletedFirstClass([FromQuery] Guid userId)
        {
            if (userId == Guid.Empty)
                return BadRequest("Invalid user ID.");

            var result = await _dashboardService.HasTutorCompletedFirstClassAsync(userId);
            return Ok(new { hasCompletedFirstClass = result });
        }

        [HttpGet("hasTutorMappedStudents")]
        public async Task<IActionResult> HasTutorMappedStudents([FromQuery] Guid userId)
        {
            if (userId == Guid.Empty)
                return BadRequest("Invalid user ID.");

            var result = await _dashboardService.HasTutorMappedStudentsAsync(userId);
            return Ok(new { hasMappedStudents = result });
        }
    }
}
