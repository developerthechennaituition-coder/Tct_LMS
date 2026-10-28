using DocumentFormat.OpenXml.Office2010.Excel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Data.Common;
using TCT.LMS.Domain;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Payroll;
using TCT.LMS.DTOs.Tutor;

namespace TCT.LMS.API.Controllers;

//[Authorize(Roles = "Admin,Coordinator")]
[ApiController]
[Authorize]
[Route("api/[controller]")]
public class TutorController : ControllerBase
{
    private readonly ITutorService _tutorService;
    private readonly ApplicationDbContext _dbContext;
    private readonly INotificationService _notificationService;

    public TutorController(ITutorService tutorService, ApplicationDbContext dbContext, INotificationService notificationService)
    {
        _tutorService = tutorService;
        _dbContext = dbContext;
        _notificationService = notificationService;
    }

    [HttpPost("CreateTutor")]
    public async Task<ActionResult> CreateTutor(TutorRequestDto user)
    {
        var createdUser = await _tutorService.AddTCTTutor(user);
        return Ok(createdUser);
    }

    [HttpPost("addupdatetutorskillset")]
    public async Task<ActionResult> AddUpdateTutorSkillset(TutorCourseDetailsDto skillset)
    {
        var createdUser = await _tutorService.AddUpdateTutorSkillset(skillset);
        return Ok(createdUser);
    }

    [HttpGet("getalltutor")]
    public async Task<ActionResult> GetAllTutor()
    {
        var tutors = await _tutorService.GetAllTutor();
        if (await IsCallerInRoleAsync("Student") && tutors.Data != null)
        {
            foreach (var tutor in tutors.Data)
            {
                tutor.Email = null;
                tutor.Phone = null;
                tutor.AlternatePhone = null;
            }
        }
        return Ok(tutors);
    }

    [HttpGet("gettutorskillset")]
    public async Task<IActionResult> GetTutorSkillset(Guid tutorId)
    {
        var skillSets = await _tutorService.GetTutorSubjects(tutorId);
        return Ok(skillSets);
    }

    [HttpGet("gettutorsubjects")]
    public async Task<IActionResult> GetTutorSubjects(Guid tutorId)
    {
        var skillSets = await _tutorService.GetTutorSubjects(tutorId);
        return Ok(skillSets);
    }

    [HttpGet("gettutorbyid")]
    public async Task<IActionResult> GetTutorById(Guid id)
    {
        var tutor = await _tutorService.GetTutorById(id);
        if (await IsCallerInRoleAsync("Student") && tutor.Data != null)
        {
            tutor.Data.Email = null;
            tutor.Data.Phone = null;
            tutor.Data.AlternatePhone = null;
        }
        return Ok(tutor);
    }

    private async Task<bool> IsCallerInRoleAsync(string roleName)
    {
        var callerId = GetCallerId();
        if (callerId == Guid.Empty) return false;

        return await (from userRole in _dbContext.UserRole
                      join role in _dbContext.Roles on userRole.RoleId equals role.Id
                      where userRole.UserId == callerId && userRole.IsActive && role.IsActive
                            && role.RoleName == roleName
                      select role.Id).AnyAsync();
    }

    private Guid GetCallerId()
    {
        return User.Claims
            .Where(claim => claim.Type.Equals("UserId", StringComparison.OrdinalIgnoreCase)
                || claim.Type == System.Security.Claims.ClaimTypes.NameIdentifier
                || claim.Type.EndsWith("/nameidentifier", StringComparison.OrdinalIgnoreCase)
                || claim.Type.Equals("sub", StringComparison.OrdinalIgnoreCase))
            .Select(claim => Guid.TryParse(claim.Value, out var id) ? id : Guid.Empty)
            .FirstOrDefault(id => id != Guid.Empty);
    }

    [HttpGet("GetAllAttendanceSubmittedTutors")]
    public async Task<ActionResult> GetAllSubmittedAttendanceTutors()
    {
        var tutors = await _tutorService.GetAllSubmittedAttendanceTutors();
        return Ok(tutors);
    }

    [AllowAnonymous]
    [HttpGet("GetTutorsByAvailability")]
    public async Task<ActionResult> GetTutorsByAvailability(Guid studentId, Guid salesId, Guid subjectId)
    {
        var result = await _tutorService.GetTutorsByAvailability(studentId, salesId, subjectId);
        return Ok(result);
    }

    [HttpPut("UpdateTutorPayment")]
    public async Task<ActionResult> UpdateTutorPayment(UpdateTutorPaymentDto input)
    {
        if (input.Payment <= 0 || string.IsNullOrWhiteSpace(input.Reason))
            return BadRequest(new { succeeded = false, message = "Proposed payment and reason are required." });

        var detail = await _dbContext.TutorDetails.FirstOrDefaultAsync(x => x.Id == input.Id && x.IsActive);
        if (detail == null) return NotFound(new { succeeded = false, message = "Tutor skill rate was not found." });
        if (detail.TutorPayment == input.Payment)
            return BadRequest(new { succeeded = false, message = "The proposed payment is the same as the current payment." });

        var callerId = GetCallerId();
        if (callerId == Guid.Empty) return Unauthorized();
        var tutor = await _dbContext.Tutor.FindAsync(detail.TutorId);
        var board = await _dbContext.Type_Code.FindAsync(detail.BoardId);
        var grade = await _dbContext.Type_Code.FindAsync(detail.GradeId);
        var pending = await _dbContext.TutorPaymentApproval.AnyAsync(x =>
            x.TutorStudentAllocationId == detail.Id && x.IsActive &&
            x.ApprovalStatus == (int)TutorPaymentStatus.Pending);
        if (pending) return Conflict(new { succeeded = false, message = "A payment request is already pending for this tutor skill." });

        var approval = new TutorPaymentApproval
        {
            Id = Guid.NewGuid(), TutorStudentAllocationId = detail.Id,
            StudentId = Guid.Empty, TutorId = detail.TutorId, SalesDetailsId = null,
            SubjectId = detail.SubjectId, Grade = grade?.TypeCodeName ?? string.Empty,
            Board = board?.TypeCodeName ?? string.Empty,
            RequestedPaymentAmount = input.Payment, BasePaymentAmount = detail.TutorPayment ?? 0,
            TutorCurrentMaxPayment = detail.TutorPayment ?? 0,
            ApprovalStatus = (int)TutorPaymentStatus.Pending,
            RequestType = (int)TutorPaymentRequestType.TutorRateChange,
            RequestedBy = callerId, RequestedDate = DateTime.UtcNow,
            EffectiveDate = input.EffectiveDate, RequestReason = input.Reason.Trim(), IsActive = true
        };
        _dbContext.TutorPaymentApproval.Add(approval);
        await _dbContext.SaveChangesAsync();
        await _notificationService.AddTutorPaymentApprovalNotification(approval.Id, callerId);
        return Ok(new { succeeded = true, message = "Tutor rate change submitted for Super Admin approval.", approvalId = approval.Id });
    }

    [HttpGet("payment-approval/{id:guid}")]
    public async Task<IActionResult> GetPaymentApproval(Guid id)
    {
        var item = await _dbContext.TutorPaymentApproval.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (item == null) return NotFound();
        var tutor = await _dbContext.Tutor.FindAsync(item.TutorId);
        var user = tutor == null ? null : await _dbContext.User.FindAsync(tutor.UserId);
        return Ok(new { item.Id, item.RequestType, RequestTypeName = ((TutorPaymentRequestType)item.RequestType).ToString(),
            item.BasePaymentAmount, item.RequestedPaymentAmount, item.ApprovedPaymentAmount,
            item.ApprovalStatus, item.RequestReason, DecisionComment = item.ApprovalRemarks,
            item.EffectiveDate, item.RequestedBy,
            TutorName = user?.FullName, item.Board, item.Grade, item.SubjectId, item.SalesDetailsId });
    }

    [HttpPost("payment-approval/decision")]
    public async Task<IActionResult> DecidePaymentApproval(TutorPaymentDecisionDto input)
    {
        if (!await IsCallerInRoleAsync("SuperAdmin")) return Forbid();
        var callerId = GetCallerId();
        if (string.IsNullOrWhiteSpace(input.Comment))
            return BadRequest(new { succeeded = false, message = "A decision comment is required." });
        var approval = await _dbContext.TutorPaymentApproval.FirstOrDefaultAsync(x => x.Id == input.ApprovalId && x.IsActive);
        if (approval == null) return NotFound(new { succeeded = false, message = "Pending payment request was not found." });

        var finalAmount = input.Approved ? (input.ApprovedAmount ?? approval.RequestedPaymentAmount) : approval.BasePaymentAmount;
        if (input.Approved && finalAmount <= 0)
            return BadRequest(new { succeeded = false, message = "Approved amount must be greater than zero." });

        if (approval.RequestType == (int)TutorPaymentRequestType.TutorRateChange)
        {
            var detail = await _dbContext.TutorDetails.FindAsync(approval.TutorStudentAllocationId);
            if (input.Approved && detail != null) detail.TutorPayment = finalAmount;
        }
        else if (approval.SalesDetailsId.HasValue)
        {
            var salesDetail = await _dbContext.SalesDetails.FindAsync(approval.SalesDetailsId.Value);
            if (salesDetail != null)
            {
                if (input.Approved)
                {
                    salesDetail.TutorPayment = finalAmount;
                    if (approval.RequestType == (int)TutorPaymentRequestType.AssignmentWithPaymentChange)
                    {
                        var approvedStatus = await _dbContext.Type_Code.FirstOrDefaultAsync(x => x.TypeCodeValue == (int)FollowUpStatus.DemoPendingTutorAssignedApproved);
                        if (approvedStatus != null) salesDetail.Status = approvedStatus.Id;
                    }
                    else if (approval.PreviousStatusId.HasValue) salesDetail.Status = approval.PreviousStatusId.Value;
                }
                else
                {
                    salesDetail.TutorPayment = approval.BasePaymentAmount;
                    if (approval.PreviousTutorId.HasValue) salesDetail.TutorId = approval.PreviousTutorId;
                    if (approval.PreviousStatusId.HasValue) salesDetail.Status = approval.PreviousStatusId.Value;
                }
            }
            var allocation = await _dbContext.TutorStudentAllocations.FindAsync(approval.TutorStudentAllocationId);
            if (allocation != null)
            {
                allocation.PaymentAmount = finalAmount;
                if (!input.Approved && approval.RequestType == (int)TutorPaymentRequestType.AssignmentWithPaymentChange)
                    allocation.IsActive = false;
            }
            if (input.Approved)
            {
                var sales = salesDetail == null ? null : await _dbContext.Sales.FindAsync(salesDetail.SalesId);
                var skillRate = sales == null ? null : await _dbContext.TutorDetails.FirstOrDefaultAsync(x =>
                    x.TutorId == approval.TutorId &&
                    x.BoardId == sales.BoardId &&
                    x.GradeId == sales.GradeId &&
                    x.SubjectId == approval.SubjectId &&
                    x.IsActive);
                if (skillRate != null) skillRate.TutorPayment = finalAmount;
            }
        }

        approval.ApprovalStatus = input.Approved ? (int)TutorPaymentStatus.Approved : (int)TutorPaymentStatus.Rejected;
        approval.ApprovedPaymentAmount = finalAmount; approval.ApprovalRemarks = input.Comment;
        approval.ApprovedBy = callerId; approval.ApprovedDate = DateTime.UtcNow; approval.IsActive = false;
        await _dbContext.SaveChangesAsync();
        await _notificationService.AddTutorPaymentDecisionNotification(approval.Id, callerId);
        if (input.Approved &&
            approval.RequestType == (int)TutorPaymentRequestType.AssignmentWithPaymentChange &&
            approval.SalesDetailsId.HasValue)
        {
            var approvedSalesDetail = await _dbContext.SalesDetails
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == approval.SalesDetailsId.Value);
            if (approvedSalesDetail != null)
            {
                await _notificationService.AddNotifications(approvedSalesDetail.SalesId,
                    approvedSalesDetail.Id, callerId, NotificationType.ApproveTutorAssignment);
            }
        }
        return Ok(new { succeeded = true, finalAmount, message = input.Approved ? "Payment request approved." : "Payment request rejected." });
    }
    [HttpGet("getalltutordetails")]
    public async Task<ActionResult> GetAllTutorDetails()
    {
        var tutors = await _tutorService.GetAllTutorDetails();
        if (await IsCallerInRoleAsync("Student") && tutors.Data != null)
        {
            foreach (var tutor in tutors.Data) tutor.Email = null;
        }
        return Ok(tutors);
    }
    [HttpGet("getalltutordetailswithfilter")]
    public async Task<IActionResult> GetAllTutorDetailsWithFilter(string? boardIds, string? gradeIds, 
        string? gradeGroupIds, string? subjectIds,
             string? search,
             int pageSize,
             int pageNumber)
    {
        var tutors = await _tutorService.GetAllTutorDetailsWithFilter(boardIds, gradeIds, gradeGroupIds, subjectIds, search, pageSize, pageNumber);
        if (await IsCallerInRoleAsync("Student") && tutors.Data != null)
        {
            foreach (var tutor in tutors.Data) tutor.Email = null;
        }
        return Ok(tutors);
    }

    [HttpDelete("deletetutorskillset")]
    [HttpPost("deletetutorskillset")]
    public async Task<IActionResult> DeleteTutorSkillset(Guid id)
    {
        var skillset = await _dbContext.TutorDetails
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == id);
        if (skillset == null)
            return NotFound(new { succeeded = false, message = "Skillset not found." });

        var callerId = User.Claims
            .Where(claim => claim.Type.Equals("UserId", StringComparison.OrdinalIgnoreCase)
                || claim.Type == System.Security.Claims.ClaimTypes.NameIdentifier
                || claim.Type.EndsWith("/nameidentifier", StringComparison.OrdinalIgnoreCase)
                || claim.Type.Equals("sub", StringComparison.OrdinalIgnoreCase))
            .Select(claim => Guid.TryParse(claim.Value, out var id) ? id : Guid.Empty)
            .FirstOrDefault(id => id != Guid.Empty);
        if (callerId == Guid.Empty)
            return Unauthorized(new { succeeded = false, message = "Your login session is invalid. Please sign in again." });

        var isOwner = await _dbContext.Tutor
            .AsNoTracking()
            .AnyAsync(tutor => tutor.Id == skillset.TutorId && tutor.UserId == callerId);

        var allowedRoles = new[] { "SuperAdmin", "SalesAdmin", "OperationsAdmin", "CoordinatorAdmin", "Coordinator" };
        var isPrivilegedUser = await (from userRole in _dbContext.UserRole
                                      join role in _dbContext.Roles on userRole.RoleId equals role.Id
                                      where userRole.UserId == callerId && userRole.IsActive && role.IsActive
                                            && allowedRoles.Contains(role.RoleName)
                                      select role.Id).AnyAsync();

        if (!isOwner && !isPrivilegedUser)
            return StatusCode(StatusCodes.Status403Forbidden,
                new { succeeded = false, message = "You can remove only skills belonging to your tutor profile." });

        var result = await _tutorService.DeleteTutorSkillset(id);
        return Ok(result);
    }
}
