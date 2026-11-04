using Microsoft.EntityFrameworkCore;
using TCT.LMS.Data.Common;
using TCT.LMS.Domain.Entities;
using Rules = TCT.LMS.Application.Services.TutorCancellationRules;

namespace TCT.LMS.Infrastructure.Repositories;

/// <summary>
/// Database side of TutorCancellationRules: the configuration, a tutor's weekly class count and monthly usage (across
/// all their courses), and the TutorCancellationTracking row of a cancelled class. Status saves (ScheduleRepository)
/// call TrackStatusChangeAsync inside their own transaction; it only adds or changes tracking rows on the context, the
/// caller saves them.
/// </summary>
internal static class TutorCancellationTracker
{
    // Schedules whose classes make up the regular weekly pattern (Operations' and older schedules, and the Weekly ones).
    // Extra one-time, temporary (added days / make-ups) and fixed-count schedules are left out.
    private const string WeeklyMode = "Weekly";

    public sealed record TutorKeys(Guid TutorId, Guid UserId)
    {
        public Guid[] Both => new[] { TutorId, UserId };
    }

    public static async Task<(Rules.Config? Config, string? Error)> LoadConfigAsync(ApplicationDbContext dbContext)
    {
        var rows = await dbContext.Thresholds.AsNoTracking()
            .Where(t => t.IsActive && t.ThresholdName != null && t.ThresholdName.StartsWith("TutorCancel"))
            .Select(t => new { t.ThresholdName, t.Value })
            .ToListAsync();
        var config = Rules.ReadConfig(rows.Select(r => (r.ThresholdName, r.Value)), out var error);
        return (config, error);
    }

    // Schedule.TutorId / SalesDetails.TutorId hold the Tutor.Id, or the tutor's User.Id on older rows.
    public static async Task<TutorKeys?> TutorKeysAsync(ApplicationDbContext dbContext, Guid? tutorKey) =>
        tutorKey is not { } key || key == Guid.Empty ? null
        : await dbContext.Tutor.AsNoTracking().Where(t => t.Id == key || t.UserId == key)
            .Select(t => new TutorKeys(t.Id, t.UserId)).FirstOrDefaultAsync();

    public static async Task<TutorKeys?> CourseTutorAsync(ApplicationDbContext dbContext, Guid salesDetailsId)
    {
        var key = await dbContext.Schedule.AsNoTracking().Where(s => s.SalesDetailsId == salesDetailsId && s.IsActive)
            .OrderByDescending(s => s.StartDate).Select(s => (Guid?)s.TutorId).FirstOrDefaultAsync()
            ?? await dbContext.SalesDetails.AsNoTracking().Where(s => s.Id == salesDetailsId).Select(s => s.TutorId).FirstOrDefaultAsync();
        return await TutorKeysAsync(dbContext, key);
    }

    // Distinct weekday + start time slots of all the tutor's regular classes in the class's month.
    public static async Task<int> WeeklyClassCountAsync(ApplicationDbContext dbContext, TutorKeys tutor, DateTime classDate)
    {
        var monthStart = Rules.MonthStart(classDate.Date);
        var monthEnd = Rules.NextMonthStart(classDate.Date);
        var keys = tutor.Both;
        var starts = await (from detail in dbContext.ScheduleDetails.AsNoTracking()
                            join schedule in dbContext.Schedule.AsNoTracking() on detail.ScheduleId equals schedule.ScheduleId
                            where keys.Contains(schedule.TutorId) && schedule.IsActive && detail.IsActive
                                && detail.ScheduleType == "Class" && (schedule.ScheduleMode == null || schedule.ScheduleMode == WeeklyMode)
                                && detail.Date >= monthStart && detail.Date < monthEnd
                            select detail.StartTime).ToListAsync();
        return Rules.WeeklyClassCount(starts);
    }

    // The tutor's cancellations (all courses) in the class's calendar month, the given class excluded.
    public static Task<int> UsedThisMonthAsync(ApplicationDbContext dbContext, Guid tutorId, DateTime classDate,
        Guid? excludeScheduleDetailsId)
    {
        var monthStart = Rules.MonthStart(classDate.Date);
        var monthEnd = Rules.NextMonthStart(classDate.Date);
        return dbContext.TutorCancellationTracking.CountAsync(t => t.TutorId == tutorId && t.IsActive
            && t.CountsAgainstAllowance && t.ClassDate >= monthStart && t.ClassDate < monthEnd
            && (excludeScheduleDetailsId == null || t.ScheduleDetailsId != excludeScheduleDetailsId));
    }

    public static async Task<Rules.Usage> UsageAsync(ApplicationDbContext dbContext, TutorKeys? tutor, DateTime classDate,
        Guid? excludeScheduleDetailsId)
    {
        var (config, error) = await LoadConfigAsync(dbContext);
        if (tutor == null) return Rules.Evaluate(config, error, 0, 0);
        var weekly = await WeeklyClassCountAsync(dbContext, tutor, classDate);
        var used = await UsedThisMonthAsync(dbContext, tutor.TutorId, classDate, excludeScheduleDetailsId);
        return Rules.Evaluate(config, error, weekly, used);
    }

    private static async Task<int?> StatusValueAsync(ApplicationDbContext dbContext, Guid? statusId) =>
        statusId.HasValue
            ? await dbContext.Type_Code.AsNoTracking().Where(c => c.Id == statusId.Value).Select(c => (int?)c.TypeCodeValue).FirstOrDefaultAsync()
            : null;

    /// <summary>
    /// A tutor's or student's status save for one class. Returns the reason when a tutor cancellation is over the
    /// allowance (nothing is changed then); otherwise adds / updates the tracking row on the context (not saved).
    /// Only the party's own Class Cancelled (1009002) is tracked; other guest types (Operations) are ignored.
    /// Cancelled -> Class Re-Scheduled (the existing Reschedule Class flow) keeps the cancellation and links the class
    /// that flow has just added as its make-up; any other change withdraws the cancellation.
    /// </summary>
    public static async Task<string?> TrackStatusChangeAsync(ApplicationDbContext dbContext, ScheduleDetails detail,
        string? guestType, Guid? previousStatusId, Guid? newStatusId, Guid actorId, DateTime nowIst)
    {
        var category = string.Equals(guestType, Rules.TutorCategory, StringComparison.OrdinalIgnoreCase) ? Rules.TutorCategory
            : string.Equals(guestType, Rules.StudentCategory, StringComparison.OrdinalIgnoreCase) ? Rules.StudentCategory
            : null;
        if (category == null || !string.Equals(detail.ScheduleType, "Class", StringComparison.OrdinalIgnoreCase)) return null;

        var wasCancelled = await StatusValueAsync(dbContext, previousStatusId) == Rules.CancelledStatusCode;
        var newCode = await StatusValueAsync(dbContext, newStatusId);
        var isCancelled = newCode == Rules.CancelledStatusCode;
        if (wasCancelled == isCancelled) return null; // repeat save of the same outcome: nothing to count again

        var schedule = await dbContext.Schedule.AsNoTracking().Where(s => s.ScheduleId == detail.ScheduleId)
            .Select(s => new { s.SalesDetailsId, s.TutorId }).FirstOrDefaultAsync();
        if (schedule == null) return null;
        var row = await dbContext.TutorCancellationTracking.FirstOrDefaultAsync(t => t.ScheduleDetailsId == detail.ScheduleDetailsId);

        if (!isCancelled)
        {
            if (row == null || !row.IsActive || row.Category != category) return null;
            // Re-scheduled through the existing Reschedule Class flow: the cancellation still counts. The new class is
            // linked by that flow itself (ScheduleNewEvent with RescheduledFromScheduleDetailsId), never guessed here.
            if (Rules.IsRescheduledStatusCode(newCode)) return null;
            // Cancellation withdrawn by the same party: it no longer counts, unless a make-up or deduction is attached.
            if (row.MakeupScheduleDetailsId == null && row.DeductionInvoiceId == null)
            {
                row.IsActive = false;
                row.ModifiedDate = nowIst;
            }
            return null;
        }

        // Already tracked under the other party (e.g. the student cancelled first): keep that one.
        if (row != null && row.IsActive && row.Category != category) return null;

        var tutor = await TutorKeysAsync(dbContext, schedule.TutorId);
        var countsAgainstAllowance = category == Rules.TutorCategory;
        if (countsAgainstAllowance)
        {
            var usage = await UsageAsync(dbContext, tutor, detail.Date, detail.ScheduleDetailsId);
            if (!usage.CanCancel) return Rules.BlockedMessage(usage, detail.Date);
        }

        if (row == null)
        {
            row = new TutorCancellationTracking { Id = Guid.NewGuid(), ScheduleDetailsId = detail.ScheduleDetailsId };
            dbContext.TutorCancellationTracking.Add(row);
        }
        else row.ModifiedDate = nowIst;
        row.SalesDetailsId = schedule.SalesDetailsId;
        row.TutorId = tutor?.TutorId ?? schedule.TutorId;
        row.Category = category;
        row.CountsAgainstAllowance = countsAgainstAllowance;
        row.ClassDate = detail.Date.Date;
        row.CancelledBy = actorId;
        row.CancelledAt = nowIst;
        row.IsActive = true;
        return null;
    }

    /// <summary>
    /// The make-up class of one cancellation, from an explicit link: the cancelled class's id and the id of the class
    /// that re-schedules it (never guessed). Linked once: an already linked cancellation, a make-up of another course or a
    /// class already linked elsewhere is refused (false). The row is changed on the context; the caller saves it.
    /// </summary>
    public static async Task<bool> LinkMakeupAsync(ApplicationDbContext dbContext, Guid cancelledScheduleDetailsId,
        Guid makeupScheduleDetailsId, string rescheduledByType, Guid? makeupRequestId, DateTime nowIst)
    {
        var row = await dbContext.TutorCancellationTracking.FirstOrDefaultAsync(t => t.ScheduleDetailsId == cancelledScheduleDetailsId && t.IsActive);
        if (row == null || row.MakeupScheduleDetailsId != null || makeupScheduleDetailsId == cancelledScheduleDetailsId) return false;
        var sameCourse = await (from detail in dbContext.ScheduleDetails.AsNoTracking()
                                join schedule in dbContext.Schedule.AsNoTracking() on detail.ScheduleId equals schedule.ScheduleId
                                where detail.ScheduleDetailsId == makeupScheduleDetailsId && schedule.SalesDetailsId == row.SalesDetailsId
                                select detail.ScheduleDetailsId).AnyAsync();
        if (!sameCourse || await dbContext.TutorCancellationTracking.AnyAsync(t => t.MakeupScheduleDetailsId == makeupScheduleDetailsId))
            return false;
        row.MakeupScheduleDetailsId = makeupScheduleDetailsId;
        if (makeupRequestId.HasValue) row.MakeupRequestId = makeupRequestId;
        row.RescheduledByType = rescheduledByType;
        row.RescheduledAt = nowIst;
        row.ModifiedDate = nowIst;
        return true;
    }
}
