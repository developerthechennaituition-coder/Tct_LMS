using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.DTOs.Assessment;

namespace TCT.LMS.API.Controllers
{
    [ApiController]
    [Authorize]
    [TypeFilter(typeof(AssessmentExceptionFilter))]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    [Route("api/[controller]")]
    public class AssessmentController : ControllerBase
    {
        private readonly IAssessmentService _assessmentService;

        public AssessmentController(IAssessmentService assessmentService)
        {
            _assessmentService = assessmentService;
        }

        // Tutor / Operations: scheduled tests awaiting or having a question paper uploaded.
        [HttpGet("schedule-options")]
        public async Task<IActionResult> GetScheduleOptions() => Ok(await _assessmentService.GetScheduleOptionsAsync());

        [HttpPost("test-schedules")]
        public async Task<IActionResult> CreateTestSchedule([FromBody] CreateTestScheduleDto dto)
        {
            var id = await _assessmentService.CreateTestScheduleAsync(dto);
            return Ok(new { success = true, id, message = "Test scheduled successfully." });
        }

        [HttpPost("test-schedules/{id}/cancel")]
        public async Task<IActionResult> CancelTestSchedule(Guid id)
        {
            await _assessmentService.CancelTestScheduleAsync(id);
            return Ok(new { success = true, message = "Test cancelled." });
        }

        [HttpGet("test-schedules")]
        public async Task<IActionResult> GetTestSchedules([FromQuery] Guid userId, [FromQuery] int roleId, [FromQuery] string? filterText = null)
        {
            var result = await _assessmentService.GetTestSchedulesForUploadAsync(userId, roleId, filterText);
            return Ok(result);
        }

        [HttpPost("upload-question-paper")]
        [RequestSizeLimit(45 * 1024 * 1024)]
        [RequestFormLimits(MultipartBodyLengthLimit = 45 * 1024 * 1024)]
        public async Task<IActionResult> UploadQuestionPaper([FromForm] UploadQuestionPaperDto dto)
        {
            if (dto.TestScheduleId == Guid.Empty)
                return BadRequest("Invalid test schedule ID.");

            await _assessmentService.UploadQuestionPaperAsync(dto);
            return Ok(new { success = true, message = "Question paper uploaded successfully." });
        }

        // Student: tests assigned to the logged-in student, with QP availability window info.
        [HttpGet("student-tests")]
        public async Task<IActionResult> GetStudentTestPapers([FromQuery] Guid studentId)
        {
            var result = await _assessmentService.GetStudentTestPapersAsync(studentId);
            return Ok(result);
        }

        [HttpGet("question-paper/{testScheduleId}/download")]
        public async Task<IActionResult> DownloadQuestionPaper(Guid testScheduleId)
        {
            var (isSuccess, fileData, fileName, contentType) = await _assessmentService.DownloadQuestionPaperAsync(testScheduleId);
            if (!isSuccess)
                return NotFound(new { message = "Question paper not found." });

            return File(fileData, string.IsNullOrEmpty(contentType) ? "application/octet-stream" : contentType, fileName);
        }

        [HttpPost("submit-answer-sheet")]
        [RequestSizeLimit(45 * 1024 * 1024)]
        [RequestFormLimits(MultipartBodyLengthLimit = 45 * 1024 * 1024)]
        public async Task<IActionResult> SubmitAnswerSheet([FromForm] SubmitAnswerSheetDto dto)
        {
            if (dto.TestScheduleId == Guid.Empty)
                return BadRequest("Invalid test schedule or student ID.");

            await _assessmentService.SubmitAnswerSheetAsync(dto);
            return Ok(new { success = true, message = "Answer sheet submitted successfully." });
        }

        // Tutor: answer sheets submitted by students, pending / completed evaluation.
        [HttpGet("answer-sheet-submissions")]
        public async Task<IActionResult> GetAnswerSheetSubmissions([FromQuery] Guid tutorId, [FromQuery] string? filterText = null)
        {
            var result = await _assessmentService.GetAnswerSheetSubmissionsAsync(tutorId, filterText);
            return Ok(result);
        }

        [HttpGet("answer-sheet/{submissionId}/download")]
        public async Task<IActionResult> DownloadAnswerSheet(Guid submissionId)
        {
            var (isSuccess, fileData, fileName, contentType) = await _assessmentService.DownloadAnswerSheetAsync(submissionId);
            if (!isSuccess)
                return NotFound(new { message = "Answer sheet not found." });

            return File(fileData, string.IsNullOrEmpty(contentType) ? "application/octet-stream" : contentType, fileName);
        }

        [HttpPost("evaluate-answer-sheet/{submissionId}")]
        public async Task<IActionResult> EvaluateAnswerSheet(Guid submissionId, [FromBody] EvaluateAnswerSheetDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            await _assessmentService.EvaluateAnswerSheetAsync(submissionId, dto);
            return Ok(new { success = true, message = "Evaluation submitted successfully." });
        }
    }
}
