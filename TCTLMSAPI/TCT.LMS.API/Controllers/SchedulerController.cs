using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Components.Forms;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Collections;
using System.Text.RegularExpressions;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Application.Services;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Invoice;
using TCT.LMS.DTOs.Payment;
using TCT.LMS.DTOs.Payroll;
using TCT.LMS.DTOs.Sales;
using TCT.LMS.DTOs.Schedule;
using TCT.LMS.DTOs.User;
using TCT.LMS.DTOs.Wrappers;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory;

namespace TCT.LMS.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class SchedulerController : ControllerBase
    {
        private readonly IScheduleService _scheduleService;
        private readonly IMasterDetailService _lookupService;
        private readonly IClassOperationsService _classOperationsService;
        private readonly IConfiguration _configuration;
        public SchedulerController(IScheduleService scheduleService, IMasterDetailService service, IClassOperationsService classOperationsService, IConfiguration configuration)
        {
            _scheduleService = scheduleService;
            _lookupService = service;
            _classOperationsService = classOperationsService;
            _configuration = configuration;
        }

        [HttpGet("future-class-completion-test-enabled")]
        public IActionResult IsFutureClassCompletionTestEnabled()
        {
            var enabled = bool.TryParse(
                _configuration["Scheduling:AllowFutureClassCompletionForTesting"], out var value) && value;
            return Ok(new { enabled });
        }


        static (bool isValid, string error) ValidateDateTime(string dateTime, int allowedMinutesDifference = 5)
        {
            if (string.IsNullOrEmpty(dateTime))
                return (false, "DateTime cannot be empty");

            if (!DateTime.TryParse(dateTime, out DateTime parsedDateTime))
                return (false, "Invalid datetime format");

            DateTime currentDateTime = DateTime.Now;

            // Validate date
            if (parsedDateTime.Date != currentDateTime.Date)
                return (false, $"Date must be current date ({currentDateTime.Date:d})");

            // Validate time within allowed difference
            TimeSpan timeDifference = currentDateTime - parsedDateTime;
            if (Math.Abs(timeDifference.TotalMinutes) > allowedMinutesDifference)
                return (false, $"Time difference exceeds allowed {allowedMinutesDifference} minutes tolerance");

            return (true, string.Empty);
        }


        [HttpGet("getLookupForClassStatus")]
        public async Task<IActionResult> GetLookupForClassStatus(string lookupCode, DateTime endTime, string scheduleType)
        {
            Response<bool> response = new Response<bool>();
            response.Data = false;

            var entity = await _lookupService.GetByTypeGroupId(lookupCode);
            var result = entity.ToList();
            var currentDate = DateTime.Now;
            if (endTime > currentDate)
            {
                if (scheduleType.ToLower() == "class")
                {
                    int[] arrayListClass = { 1009002, 1009003, 1009004, 1009005, 1009006, 1009007 };
                    result = result.Where(s => arrayListClass.Contains(s.TypeCodeValue)).ToList();
                }
                else
                {
                    int[] arrayListDemo = { 20015, 20016, 20018, 20019, 20028, 20041 };
                    result = result.Where(s => arrayListDemo.Contains(s.TypeCodeValue)).ToList();
                }
                return Ok(result);
            }

            if (scheduleType.ToLower() == "class")
            {
                int[] arrayList = { 1009001, 1009002, 1009003, 1009004, 1009005, 1009006, 1009007 };
                result = result.Where(s => arrayList.Contains(s.TypeCodeValue)).ToList();
            }
            else
            {
                int[] arrayListDemo = { 20015, 20016, 20018, 20019, 20028, 20041 };
                result = result.Where(s => arrayListDemo.Contains(s.TypeCodeValue)).ToList();
            }

            return Ok(result);
        }


        [HttpGet("getscheduledeventbyid")]
        public async Task<IActionResult> GetAllScheduledEvents(Guid guestId, string guestType)
        {
            var result = await _scheduleService.GetAllScheduledEvents(guestId, guestType);
            return Ok(result);
        }

        [HttpGet("getScheduleDetailsById")]
        public async Task<IActionResult> getScheduleDetailsById(Guid guestId, string guestType, string month, string year)
        {
            if (string.Equals(guestType, "accounts", StringComparison.OrdinalIgnoreCase) &&
                !User.IsInRole("Accounts") && !User.IsInRole("AccountsAdmin") &&
                !User.IsInRole("SuperAdmin") && !User.IsInRole("Admin"))
            {
                return Forbid();
            }
            var result = await _scheduleService.GetScheduleDetailsById(guestId, guestType, month, year);
            return Ok(result);
        }

        // Operations "View Calendar": organisation-wide, read-only calendar for the month (all tutors and
        // students). Reuses the existing all-schedules query of getScheduleDetailsById.
        [HttpGet("getAllScheduleDetails")]
        [Authorize(Roles = "Operations,OperationsAdmin,SuperAdmin,Admin")]
        public async Task<IActionResult> GetAllScheduleDetails(string month, string year)
        {
            var result = await _scheduleService.GetScheduleDetailsById(Guid.Empty, "accounts", month, year);
            return Ok(result);
        }

        [HttpGet("getstudentclasses")]
        public async Task<IActionResult> GetStudentClasses(Guid studentId)
        {
            var result = await _scheduleService.GetStudentClasses(studentId);
            return Ok(result);
        }

        [HttpGet("validatetimeslot")]
        public async Task<IActionResult> ValidateTimeSlot(Guid studentId, Guid tutorId, DateTime startTime, DateTime endDate)
        {
            var result = await _scheduleService.GetStudentClasses(studentId);
            return Ok(result);
        }

        [HttpPost("Saveschedule")]
        public async Task<IActionResult> AddSchedule(ScheduleDTO schedule)
        {
            var result = await _scheduleService.AddSchedule(schedule);
            return Ok(result);

        }


        [HttpPost("updateScheduleStatus")]
        public async Task<IActionResult> UpdateScheduleStatus([FromForm] TCTEvent inputData)
        {
            var result = await _scheduleService.UpdateScheduleStatus(inputData);
            return Ok(result);
        }

        [HttpGet("GetScheduleByTutorId")]
        public async Task<IActionResult> GetScheduleByTutorId(Guid tutorId)
        {
            var result = await _scheduleService.GetScheduleByTutorId(tutorId);
            return Ok(result);
        }

        [HttpGet("GetScheduleBySubjectId")]
        public async Task<IActionResult> GetScheduleBySubjectId(Guid tutorId, Guid subjectId, Guid studentId)
        {
            var result = await _scheduleService.GetScheduleBySubjectId(tutorId, subjectId, studentId);
            return Ok(result);
        }

        [HttpPost("AddOrUpdateSchedule")]
        public async Task<IActionResult> AddOrUpdateSchedule(Schedule1Dto schedule)
        {
            var result = await _scheduleService.AddOrUpdateSchedule(schedule);
            return Ok(result);
        }

        [HttpPost("ScheduleEvent")]
        public async Task<IActionResult> ScheduleEvent([FromBody] TimeSlotsGroup input)
        {
            try
            {
                var result = await _scheduleService.ScheduleNewEvent(input);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { succeeded = false, message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { succeeded = false, message = ex.Message });
            }
        }


        [HttpPost("approveRecjectTutorAttendance")]
        public async Task<IActionResult> ApproveSchedules(ScheduleApprovalRequest request)
        {
            var result = await _scheduleService.ApproveRejectTutorSchedules(request);
            return Ok(result);
        }


        [HttpGet("gettutorpayroll")]
        public async Task<ActionResult> GetTutorPayroll([FromQuery] string month, [FromQuery] string year)
        {
            // Pass the month and year parameters to your service method
            var tutors = await _scheduleService.GetTutorPayroll(month, year);
            return Ok(tutors);
        }

        [HttpPost("generatetutorpayroll")]
        public async Task<ActionResult> GenerateTutorPayrollInvoice(Guid tutorId)
        {
            var tutors = await _scheduleService.GenerateTutorPayroll(tutorId);
            return Ok(tutors);
        }

        [HttpDelete("deleteclass")]
        public async Task<IActionResult> DeleteClass(Guid scheduleDetailsId, Guid userId)
        {
            var result = await _scheduleService.DeleteClass(scheduleDetailsId, userId);
            return Ok(result);
        }

        [HttpDelete("removeScheduler")]
        public async Task<IActionResult> RemoveSchedule(Guid scheduleId, Guid userId)
        {
            var result = await _scheduleService.RemoveSchedule(scheduleId, userId);
            return Ok(result);
        }

        [HttpPost("updatescheduledetails")]
        public async Task<IActionResult> UpdateScheduleDetails(UpdateClass updateClass)
        {
            var result = await _scheduleService.UpdateScheduleDetails(updateClass);
            return Ok(result);
        }


        [HttpGet("gettutorpayrolllist")]
        public async Task<ActionResult> GetTutorPayrollList(Guid tutorId)
        {
            var tutors = await _scheduleService.GetTutorPayrollList(tutorId);
            return Ok(tutors);
        }


        [HttpGet("getstudentinvoicelist")]
        public async Task<ActionResult> GetStudentInvoiceList(Guid studentid)
        {
            var students = await _scheduleService.GetStudentInvoiceList(studentid);
            return Ok(students);
        }

        [HttpGet("gettutorinvoicebyid")]
        public async Task<ActionResult> GetTutorInvoiceByInvoiceNumber(string invoiceNumber)
        {
            var tutors = await _scheduleService.GetTutorInvoiceById(invoiceNumber);
            return Ok(tutors);
        }

        [HttpGet("getstudentinvoicebyid")]
        public async Task<ActionResult> GetStudentInvoiceByInvoiceNumber(string invoiceNumber)
        {
            var tutors = await _scheduleService.GetStudentInvoiceById(invoiceNumber);
            return Ok(tutors);
        }

        [HttpGet("GetTutorAllocatedSchedule")]
        public async Task<ActionResult> GetTutorAllocatedSchedule(Guid tutorId)
        {
            var tutors = await _scheduleService.GetTutorAllocatedSchedule(tutorId);
            return Ok(tutors);
        }

        [HttpGet("GetStudentAllocatedSchedule")]
        public async Task<IActionResult> GetStudentAllocatedSchedule(Guid userId, Guid studentId, Guid salesDetailsId)
        {
            var result = await _scheduleService.GetStudentAllocatedSchedule(userId, studentId, salesDetailsId);
            return Ok(result);
        }

        [HttpGet("studentschedulesummary")]
        public async Task<IActionResult> GetStudentSchedules([FromQuery] Guid studentId, [FromQuery] int month, [FromQuery] int year)
        {
            var result = await _scheduleService.GetStudentSchedulesAsync(studentId, month, year);
            return Ok(result);
        }

        // Due Timings: every student's subject with the share of the month's classes completed.
        [HttpGet("class-completion")]
        [Authorize(Roles = "Accounts,AccountsAdmin,Payroll,PayrollAdmin,SuperAdmin,Admin,CoordinatorAdmin")]
        public async Task<IActionResult> GetClassCompletion([FromQuery] int month, [FromQuery] int year)
        {
            if (month < 1 || month > 12 || year < 2000 || year > 9998)
                return BadRequest("Invalid month or year.");
            return Ok(await _scheduleService.GetClassCompletionListAsync(month, year));
        }

        [HttpPost("createstudentinvoice")]
        [Authorize(Roles = "Accounts,AccountsAdmin,Payroll,PayrollAdmin,SuperAdmin")]
        public async Task<IActionResult> StudentInvoice(CreateInvoiceRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);
            if (!TryGetActorId(out var actor)) return Unauthorized();
            request.CreatedBy = actor;

            var response = await _scheduleService.CreateStudentInvoiceAsync(request);

            return response.Success ? Ok(response) : BadRequest(response);
        }

        // Prepaid v2: raise the single upfront full-period invoice for the student's
        // active prepaid plan(s). Re-calling returns the same invoice (idempotent).
        [HttpPost("createprepaidupfrontinvoice")]
        [Authorize(Roles = "Accounts,AccountsAdmin,Payroll,PayrollAdmin,SuperAdmin")]
        public async Task<IActionResult> PrepaidUpfrontInvoice([FromBody] CreateInvoiceRequest request)
        {
            if (request == null || request.StudentId == Guid.Empty)
                return BadRequest("StudentId is required.");

            if (!TryGetActorId(out var actor)) return Unauthorized();
            var response = await _scheduleService.CreatePrepaidUpfrontInvoiceAsync(request.StudentId, actor);

            return response.Success ? Ok(response) : BadRequest(response);
        }

        // Advance invoices (a subject's first month, raised when its regular classes are first scheduled).
        [HttpGet("advance-invoices")]
        [Authorize(Roles = "Accounts,AccountsAdmin,Payroll,PayrollAdmin,SuperAdmin")]
        public async Task<IActionResult> AdvanceInvoices([FromQuery] Guid studentId) =>
            Ok(await _scheduleService.GetAdvanceInvoicesAsync(studentId));

        // Accounts send an advance invoice to the parent (email with the payment link).
        [HttpPost("advance-invoices/{invoiceNumber}/send")]
        [Authorize(Roles = "Accounts,AccountsAdmin,Payroll,PayrollAdmin,SuperAdmin")]
        public async Task<IActionResult> SendAdvanceInvoice(string invoiceNumber)
        {
            try
            {
                var result = await _scheduleService.SendAdvanceInvoiceAsync(invoiceNumber);
                return result.Succeeded ? Ok(result) : BadRequest(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { succeeded = false, message = $"The invoice email could not be sent: {ex.Message}" });
            }
        }

        // Monthly reconciliation: zero within package entitlement; invoice only
        // approved completed extras not already recorded in the immutable ledger.
        [HttpPost("createprepaidstatement")]
        [Authorize(Roles = "Accounts,AccountsAdmin,Payroll,PayrollAdmin,SuperAdmin")]
        public async Task<IActionResult> PrepaidStatement([FromBody] CreateInvoiceRequest request)
        {
            if (request == null || request.StudentId == Guid.Empty)
                return BadRequest("StudentId is required.");

            if (!TryGetActorId(out var actor)) return Unauthorized();
            var response = await _scheduleService.CreatePrepaidStatementInvoiceAsync(
                request.StudentId, request.Month, request.Year, actor);

            return response.Success ? Ok(response) : BadRequest(response);
        }

        // Refresh package restrictions without billing future scheduled classes.
        [HttpPost("checkprepaidoverrun")]
        [Authorize(Roles = "Accounts,AccountsAdmin,Payroll,PayrollAdmin,SuperAdmin")]
        public async Task<IActionResult> CheckPrepaidOverrun([FromBody] CreateInvoiceRequest request)
        {
            if (request == null || request.StudentId == Guid.Empty)
                return BadRequest("StudentId is required.");

            if (!TryGetActorId(out var actor)) return Unauthorized();
            var response = await _scheduleService.ProcessPrepaidOverrunAsync(request.StudentId, actor);

            return response.Succeeded ? Ok(response) : BadRequest(response);
        }

        // Prepaid v2: SalesDetails ids whose plan is blocked — the calendars freeze + red-flag
        // those subjects' remaining classes.
        [HttpGet("blockedplans")]
        public async Task<IActionResult> GetBlockedPlans()
        {
            var result = await _scheduleService.GetBlockedSalesDetailsIdsAsync();
            return Ok(result);
        }

        /// <summary>
        /// Get student invoice details by invoice number
        /// </summary>
        /// <param name="invoiceNumber"></param>
        /// <returns></returns>
        [HttpGet("studentinvoice")]
        [ProducesResponseType(typeof(IEnumerable<StudentInvoiceViewModel>), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(500)]
        public async Task<ActionResult<IEnumerable<StudentInvoiceViewModel>>> GetStudentInvoiceDetails(string invoiceNumber)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(invoiceNumber))
                    return BadRequest("Invoice number is required");

                var result = await _scheduleService.GetStudentInvoiceDetailsByNumberAsync(invoiceNumber);

                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("studentDashboardSummary")]
        public async Task<IActionResult> GetStudentScheduleSummary([FromQuery] Guid userId)
        {
            if (userId == Guid.Empty)
                return BadRequest("Invalid user ID.");

            var result = await _scheduleService.GetStudentScheduleSummaryAsync(userId);
            return Ok(result);
        }

        [HttpGet("scheduledetails")]
        public async Task<ActionResult> GetScheduleDetailsById(Guid scheduleDetailsId)
        {
            var result = await _scheduleService.GetScheduleDetailsById(scheduleDetailsId);
            if (result.Data == null) return NotFound(result);
            var callerId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("UserId")?.Value;
            if (!Guid.TryParse(callerId, out var userId)) return Unauthorized();
            if ((User.IsInRole("Student") && result.Data.StudentUserId != userId)
                || (User.IsInRole("Tutor") && result.Data.TutorUserId != userId)) return Forbid();
            return Ok(result);
        }


        [HttpPost("UpdateScheduleDetail")]
        public async Task<ActionResult> UpdateScheduleDetail([FromBody] TCTEvent inputData)
        {
            var result = await _scheduleService.UpdateScheduleDetail(inputData);
            return Ok(result);
        }

        [HttpPost("schedulechangerequest")]
        public async Task<ActionResult> ScheduleChangeRequest([FromBody] ScheduleChangeRqstDTO inputData)
        {
            var result = await _scheduleService.ScheduleChangeRequest(inputData);
            return Ok(result);
        }

        [HttpPost("generateTutorInvoice")]
        public async Task<IActionResult> GenerateInvoice([FromBody] GenerateTutorInvoiceRequestDto request)
        {
            try
            {
                var result = await _scheduleService.GenerateTutorInvoiceAsync(request);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (SqlException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [AllowAnonymous]
        [HttpGet("GetTutorPaySlipPdf")]
        public async Task<IActionResult> GetTutorPaySlipPdf([FromQuery] string invoiceNumber)
        {
            try
            {
                var pdfBytes = await _scheduleService.GetTutorPaySlipPdfAsync(invoiceNumber);
                Response.Headers["Content-Disposition"] = $"inline; filename=\"PaySlip-{invoiceNumber}.pdf\"";
                return File(pdfBytes, "application/pdf");
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(ex.Message);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("getDemoPending")]
        [ProducesResponseType<List<SalesSummaryResponseDto>>(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetDemoPending(CancellationToken ct)
        {
            IReadOnlyList<SalesSummaryResponseDto> rows = await _scheduleService.GetAsync(ct);
            return Ok(rows);
        }

        [HttpGet("getNeedToSchedule")]
        [ProducesResponseType<List<SalesSummaryResponseDto>>(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetNeedToSchedule(CancellationToken ct)
        {
            IReadOnlyList<SalesSummaryResponseDto> rows = await _scheduleService.GetNeedToSchedule(ct);
            return Ok(rows);
        }

        [HttpGet("getScheduleByStatus")]
        [ProducesResponseType<List<SalesSummaryResponseDto>>(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetScheduleByStatus([FromQuery] string codes, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(codes) || !Regex.IsMatch(codes, @"^\d+(,\d+)*$"))
                return BadRequest("codes must be a comma-separated list of integers.");

            IReadOnlyList<SalesSummaryResponseDto> rows = await _scheduleService.GetScheduleByStatus(codes, ct);
            return Ok(rows);
        }

        [HttpGet("GetTutorEngagmentInfo")]
        public async Task<IActionResult> GetTutorEngagmentInfo(Guid tutorId)
        {
            var result = await _scheduleService.GetTutorEngagmentInfo(tutorId);
            return Ok(result);
        }

        [AllowAnonymous]
        [HttpGet("GetTutorDashboardInfo")]
        public async Task<IActionResult> GetTutorDashboardInfo(Guid tutorId)
        {
            var result = await _scheduleService.GetTutorDashboardInfo(tutorId);
            return Ok(result);
        }

        [HttpGet("completed-class-details")]
        public async Task<ActionResult<Response<List<ClassScheduleDetailsReportDto>>>> GetCompletedClassScheduleDetails([FromQuery] Guid? studentId = null, [FromQuery] Guid? tutorId = null, [FromQuery] Guid? operationId = null, [FromQuery] DateTime? fromDate = null, [FromQuery] DateTime? toDate = null, [FromQuery] Guid? operationStatus = null)
        {
            var result = await _scheduleService.GetCompletedClassScheduleDetailsAsync(studentId, tutorId, operationId, fromDate, toDate, operationStatus);
            return Ok(result);
        }

        [HttpPut("update-operation-schedule-status")]
        [Authorize(Roles = "SuperAdmin,Admin,OperationsAdmin,Operations,CoordinatorAdmin,Coordinator")]
        public async Task<IActionResult> UpdateOperationScheduleStatus([FromBody] UpdateOperationScheduleStatusRequest request)
        {
            if (request == null || request.ScheduleDetailsId == Guid.Empty)
            {
                return BadRequest("Invalid request.");
            }

            var result = await _scheduleService.UpdateOperationScheduleStatus(request);
            return Ok(result);
        }

        [HttpPut("bulk-update-operation-schedule-status")]
        [HttpPost("bulk-update-operation-schedule-status")]
        [Authorize(Roles = "SuperAdmin,Admin,OperationsAdmin,Operations,CoordinatorAdmin,Coordinator")]
        public async Task<IActionResult> BulkUpdateOperationScheduleStatus([FromBody] BulkUpdateOperationScheduleStatusRequest request)
        {
            if (request == null || request.ScheduleDetailsIds == null || !request.ScheduleDetailsIds.Any())
            {
                return BadRequest("Invalid request. At least one ScheduleDetailsId is required.");
            }

            var result = await _scheduleService.BulkUpdateOperationScheduleStatus(request);
            return Ok(result);
        }

        [HttpPost("updateScheduleApprovalStatus")]
        public async Task<IActionResult> UpdateScheduleApprovalStatus([FromBody] ScheduleStatusUpdateRequest request)
        {
            if (request == null || request.ScheduleIds == null || !request.ScheduleIds.Any())
                return BadRequest("Invalid request. At least one ScheduleId is required.");

            var result = await _scheduleService.UpdateScheduleApprovalStatus(request);
            return Ok(result);
        }

        [AllowAnonymous]
        [HttpGet("tutor-status-count")]
        public async Task<IActionResult> GetTutorScheduleStatusCount(DateTime? fromDate, DateTime? toDate, Guid? operationId = null)
        {
            var result = await _classOperationsService.GetClassStatusSummary(fromDate, toDate, null, operationId);

            return Ok(result);
        }

        // ── Prepaid payment plans (Scenario 1) ──────────────────────────────
        [HttpPost("payment-plan")]
        [Authorize(Roles = "Accounts,AccountsAdmin,Payroll,PayrollAdmin,SuperAdmin,Coordinator,CoordinatorAdmin")]
        public async Task<IActionResult> AddOrUpdatePaymentPlan([FromBody] CreatePaymentPlanRequest request)
        {
            if (request == null || request.SalesDetailsId == Guid.Empty)
                return BadRequest("SalesDetailsId is required.");

            if (!TryGetActorId(out var actor)) return Unauthorized();
            request.UserId = actor;
            var result = await _scheduleService.AddOrUpdatePaymentPlanAsync(request);
            return Ok(result);
        }

        [HttpPost("payment-plan/record-payment")]
        [Authorize(Roles = "Accounts,AccountsAdmin,Payroll,PayrollAdmin,SuperAdmin")]
        public async Task<IActionResult> RecordPayment([FromBody] RecordPaymentRequest request)
        {
            if (request == null || request.StudentPaymentPlanId == Guid.Empty)
                return BadRequest("StudentPaymentPlanId is required.");

            if (!TryGetActorId(out var actor)) return Unauthorized();
            request.UserId = actor;
            var result = await _scheduleService.RecordPaymentAsync(request);
            return Ok(result);
        }

        // "UserId" first: the JWT handler maps the token's "sub" (a fixed service name) onto NameIdentifier,
        // so NameIdentifier is not always the user's id.
        private bool TryGetActorId(out Guid userId) => Guid.TryParse(
            User.FindFirst("UserId")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out userId)
            && userId != Guid.Empty;

        [HttpGet("payment-plan/by-sales-details/{salesDetailsId}")]
        public async Task<IActionResult> GetPaymentPlanBySalesDetails(Guid salesDetailsId)
        {
            var result = await _scheduleService.GetPaymentPlanBySalesDetailsIdAsync(salesDetailsId);
            return Ok(result);
        }

        [HttpGet("payment-plan/by-student/{studentId}")]
        public async Task<IActionResult> GetPaymentPlansByStudent(Guid studentId)
        {
            var result = await _scheduleService.GetPaymentPlansByStudentIdAsync(studentId);
            return Ok(result);
        }

        [AllowAnonymous]
        [HttpGet("scheduled-student-list")]
        public async Task<IActionResult> GetScheduledStudentList([FromQuery] ScheduleReportQueryParams input)
        {
            var result = await _classOperationsService.GetScheduledStudentList(input);
            return Ok(result);
        }

        [AllowAnonymous]
        [HttpGet("scheduled-tutor-list")]
        public async Task<IActionResult> GetScheduledTutorList([FromQuery] ScheduleReportQueryParams input)
        {
            var result = await _classOperationsService.GetScheduledTutorList(input);
            return Ok(result);
        }
    }
}
