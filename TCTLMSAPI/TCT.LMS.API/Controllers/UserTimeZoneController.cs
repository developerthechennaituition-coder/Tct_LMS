using Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TCT.LMS.Data.Common;
using TCT.LMS.Domain;
using TCT.LMS.DTOs.User;

namespace TCT.LMS.API.Controllers;

// Profile → "Time zone". Kept apart from CreateTCTUser, which rewrites the whole user record:
// only this controller writes User.TimeZoneId, and it writes nothing else.
[Authorize]
[ApiController]
[Route("api/User")]
public class UserTimeZoneController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;

    public UserTimeZoneController(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    // The IANA IDs the server can resolve; the profile dropdown offers only these.
    [HttpGet("timezones")]
    public ActionResult<SupportedTimeZonesResponse> GetSupportedTimeZones()
    {
        var available = TctTime.SupportsIanaTimeZones;
        return Ok(new SupportedTimeZonesResponse
        {
            Available = available,
            TimeZoneIds = available ? TctTime.GetSupportedIanaIds() : Array.Empty<string>()
        });
    }

    // Sets (or, with a null/blank TimeZoneId, clears) a user's timezone. Allowed for the user themself,
    // and for staff who may edit that student or tutor (see CanSetTimeZoneForAsync).
    [HttpPost("{id:guid}/timezone")]
    public async Task<ActionResult<UserTimeZoneResponse>> UpdateTimeZone(Guid id, [FromBody] UpdateUserTimeZoneRequest request)
    {
        var callerId = User.Claims
            .Where(claim => claim.Type.Equals("UserId", StringComparison.OrdinalIgnoreCase)
                || claim.Type == System.Security.Claims.ClaimTypes.NameIdentifier
                || claim.Type.EndsWith("/nameidentifier", StringComparison.OrdinalIgnoreCase)
                || claim.Type.Equals("sub", StringComparison.OrdinalIgnoreCase))
            .Select(claim => Guid.TryParse(claim.Value, out var value) ? value : Guid.Empty)
            .FirstOrDefault(value => value != Guid.Empty);
        if (callerId == Guid.Empty)
            return Unauthorized(Fail(id, "Your login session is invalid. Please sign in again."));

        // Checked before the user is looked up, so a refused caller cannot learn whether the user exists.
        if (callerId != id && !await CanSetTimeZoneForAsync(callerId, id))
            return StatusCode(StatusCodes.Status403Forbidden, Fail(id, "You do not have permission to change this user's time zone."));

        string? timeZoneId = null;
        if (!string.IsNullOrWhiteSpace(request.TimeZoneId))
        {
            // Only IDs offered by GET timezones: rejects fixed-offset IDs such as "EST", which ignore daylight saving.
            if (!TctTime.TryGetIanaId(request.TimeZoneId, out var ianaId) || ianaId.Length > 64
                || !TctTime.GetSupportedIanaIds().Contains(ianaId))
                return BadRequest(Fail(id, "The selected time zone is not supported. Please choose one from the list."));
            timeZoneId = ianaId;
        }

        var user = await _dbContext.User.FirstOrDefaultAsync(value => value.Id == id);
        if (user == null)
            return NotFound(Fail(id, "User not found."));

        // Tracked-entity change: only TimeZoneId, ModifiedBy and ModifiedDate are written.
        if (!string.Equals(user.TimeZoneId, timeZoneId, StringComparison.Ordinal))
        {
            user.TimeZoneId = timeZoneId;
            user.ModifiedBy = callerId;
            user.ModifiedDate = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();
        }

        return Ok(new UserTimeZoneResponse
        {
            Succeeded = true,
            UserId = id,
            TimeZoneId = timeZoneId,
            Message = timeZoneId == null ? "Time zone cleared." : "Time zone saved."
        });
    }

    // Another user's timezone, by role only (menu permissions are not used: e.g. Tutors hold "Student List" Edit):
    // Super Admin and Coordinator Admin → students and tutors; Coordinator → students only. Super Admin also →
    // Coordinators, Coordinator Admins, Operations and Operations Admins. Everyone else is refused.
    // The caller's roles are checked first, so a refused caller never causes the target to be looked up.
    private async Task<bool> CanSetTimeZoneForAsync(Guid callerId, Guid targetId)
    {
        var callerRoles = await _dbContext.UserRole
            .Where(userRole => userRole.UserId == callerId && userRole.IsActive)
            .Select(userRole => userRole.RoleId)
            .ToListAsync();
        var isSuperAdmin = callerRoles.Contains((int)UserRoleEnum.SuperAdmin);
        var managesStudentsAndTutors = isSuperAdmin
            || callerRoles.Contains((int)UserRoleEnum.CoordinatorAdmin);
        var managesStudents = managesStudentsAndTutors || callerRoles.Contains((int)UserRoleEnum.Coordinator);
        if (!managesStudents)
            return false;

        var targetRoles = await _dbContext.UserRole
            .Where(userRole => userRole.UserId == targetId && userRole.IsActive)
            .Select(userRole => userRole.RoleId)
            .ToListAsync();
        if (targetRoles.Contains((int)UserRoleEnum.Student))
            return true;
        if (managesStudentsAndTutors && targetRoles.Contains((int)UserRoleEnum.Tutor))
            return true;
        return isSuperAdmin && targetRoles.Any(role => SuperAdminManagedStaffRoles.Contains(role));
    }

    private static readonly int[] SuperAdminManagedStaffRoles =
    {
        (int)UserRoleEnum.Coordinator, (int)UserRoleEnum.CoordinatorAdmin,
        (int)UserRoleEnum.Operations, (int)UserRoleEnum.OperationsAdmin
    };

    private static UserTimeZoneResponse Fail(Guid userId, string message) =>
        new() { Succeeded = false, UserId = userId, Message = message };
}
