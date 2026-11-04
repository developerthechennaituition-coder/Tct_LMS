using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using TCT.LMS.Data.Common;
using TCT.LMS.DTOs.Schedule;
using TCT.LMS.DTOs.User;
using Rules = TCT.LMS.Application.Services.ClassActionAuthorizationRules;

namespace TCT.LMS.API.Filters;

/// <summary>
/// SchedulerController's cancel / re-schedule requests (ClassActionAuthorizationRules): a Tutor or Student may cancel
/// or re-schedule only their own classes, as themselves. Applies to a status save with a cancel / re-schedule status
/// (TCTEvent), the Reschedule Class flow's new class (TimeSlotsGroup with IsReschedule) and moving a class's time
/// (UpdateClass with CanUpdateDate). Staff and every other request are passed through unchanged. Read-only.
/// </summary>
public sealed class ClassActionAuthorizationFilter : IAsyncActionFilter
{
    private readonly ApplicationDbContext _dbContext;

    public ClassActionAuthorizationFilter(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var user = context.HttpContext.User;
        var roles = user.Claims.Where(c => c.Type == ClaimTypes.Role || c.Type.Equals("role", StringComparison.OrdinalIgnoreCase))
            .Select(c => c.Value).Distinct().ToList();
        var restricted = Rules.RestrictedAs(roles);
        if (restricted == null)
        {
            await next();
            return;
        }

        var callerId = CallerId(user);
        string? error = null;
        foreach (var argument in context.ActionArguments.Values)
        {
            switch (argument)
            {
                case TCTEvent status when await IsCancelOrRescheduleAsync(status.EventStatus):
                    error = Rules.Check(roles, status.GuestType, status.UserId, callerId,
                        await OwnsClassAsync(restricted, callerId, status.ScheduleDetailsId));
                    break;
                case TimeSlotsGroup schedule when schedule.IsReschedule:
                    var ownsCourse = await OwnsCourseAsync(restricted, callerId, schedule.SalesDetailsId);
                    if (ownsCourse && schedule.RescheduledFromScheduleDetailsId is { } original)
                        ownsCourse = await OwnsClassAsync(restricted, callerId, original)
                            && await _dbContext.ScheduleDetails.AsNoTracking().AnyAsync(d => d.ScheduleDetailsId == original
                                && _dbContext.Schedule.Any(s => s.ScheduleId == d.ScheduleId && s.SalesDetailsId == schedule.SalesDetailsId));
                    error = Rules.Check(roles, null, schedule.UserId, callerId, ownsCourse);
                    break;
                case UpdateClass move when move.CanUpdateDate:
                    error = Rules.Check(roles, null, move.UserId, callerId, await OwnsClassAsync(restricted, callerId, move.ScheduleDetailsId));
                    break;
            }
            if (error != null) break;
        }

        if (error != null)
        {
            context.Result = new ObjectResult(new { succeeded = false, message = error }) { StatusCode = StatusCodes.Status403Forbidden };
            return;
        }
        await next();
    }

    private async Task<bool> IsCancelOrRescheduleAsync(Guid? statusId) =>
        statusId is { } id && id != Guid.Empty
        && Rules.IsCancelOrReschedule(await _dbContext.Type_Code.AsNoTracking().Where(c => c.Id == id)
            .Select(c => (int?)c.TypeCodeValue).FirstOrDefaultAsync());

    // The caller's ids as stored on Schedule: Tutor.Id or the tutor's User.Id; Student.Id.
    private async Task<List<Guid>> OwnerKeysAsync(string restricted, Guid callerId)
    {
        if (restricted != "tutor")
            return await _dbContext.Student.AsNoTracking().Where(s => s.UserId == callerId).Select(s => s.Id).ToListAsync();
        var tutors = await _dbContext.Tutor.AsNoTracking().Where(t => t.UserId == callerId).Select(t => new { t.Id, t.UserId }).ToListAsync();
        return tutors.SelectMany(t => new[] { t.Id, t.UserId }).Distinct().ToList();
    }

    private async Task<bool> OwnsClassAsync(string restricted, Guid callerId, Guid scheduleDetailsId)
    {
        var keys = await OwnerKeysAsync(restricted, callerId);
        if (keys.Count == 0) return false;
        return await (from detail in _dbContext.ScheduleDetails.AsNoTracking()
                      join schedule in _dbContext.Schedule.AsNoTracking() on detail.ScheduleId equals schedule.ScheduleId
                      where detail.ScheduleDetailsId == scheduleDetailsId
                          && (restricted == "tutor" ? keys.Contains(schedule.TutorId) : keys.Contains(schedule.StudentId))
                      select detail.ScheduleDetailsId).AnyAsync();
    }

    private async Task<bool> OwnsCourseAsync(string restricted, Guid callerId, Guid salesDetailsId)
    {
        var keys = await OwnerKeysAsync(restricted, callerId);
        if (keys.Count == 0) return false;
        return await _dbContext.Schedule.AsNoTracking().AnyAsync(s => s.SalesDetailsId == salesDetailsId && s.IsActive
            && (restricted == "tutor" ? keys.Contains(s.TutorId) : keys.Contains(s.StudentId)));
    }

    // The "UserId" claim first: the JWT handler maps "sub" onto NameIdentifier (as ScheduleCalendarController).
    private static Guid CallerId(ClaimsPrincipal user) =>
        Guid.TryParse(user.FindFirst("UserId")?.Value ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id) ? id : Guid.Empty;
}
