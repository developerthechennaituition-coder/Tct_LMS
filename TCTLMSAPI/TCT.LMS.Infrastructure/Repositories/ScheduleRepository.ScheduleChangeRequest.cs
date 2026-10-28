using Microsoft.EntityFrameworkCore;
using TCT.LMS.Application.Services;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Schedule;

namespace TCT.LMS.Infrastructure.Repositories;

// Schedule Calendar requests: tutors and students ask to add class day(s); the request is checked like a
// direct change (AddWeeklyDayChangeAsync dry run) and waits for Operations. On approval the classes are added
// by AddWeeklyDayChangeAsync itself, so the result is the same as when Operations add them.
public partial class ScheduleRepository
{
    public const string PermanentRescheduleKind = "PermanentReschedule";

    // Calendar "Request for Re-schedule" chosen as Permanent: the weekly class (this one and the same weekday/time
    // after it) moves to the new slot once Operations approve. Checked now like Operations' own permanent change.
    public async Task<ScheduleChangeRequestResultDto> CreatePermanentRescheduleRequestAsync(Guid scheduleDetailsId, Guid userId,
        string requesterType, DateTime newStart, DateTime newEnd)
    {
        ScheduleChangeRequestResultDto Fail(string message) => new() { Succeeded = false, Message = message };

        var source = await (from detail in _dbContext.ScheduleDetails
                            join schedule in _dbContext.Schedule on detail.ScheduleId equals schedule.ScheduleId
                            where detail.ScheduleDetailsId == scheduleDetailsId && detail.IsActive && schedule.IsActive
                            select new { detail, schedule.SalesDetailsId, schedule.ScheduleMode }).FirstOrDefaultAsync();
        if (source == null) return Fail("Class not found.");
        if (source.ScheduleMode != WeeklyScheduleMode)
            return Fail("This class is not part of the regular weekly schedule, so it cannot be re-scheduled permanently. Choose Temporary.");
        if (newEnd <= newStart || newEnd.Date != newStart.Date)
            return Fail("Pick the new class time from the available slots.");
        if (await _dbContext.ScheduleChangeRequest.AnyAsync(r => r.ScheduleDetailsId == scheduleDetailsId
                && r.RequestKind == PermanentRescheduleKind && r.Status == (int)ClassStatusEditRequestStatus.Pending))
        {
            var duplicate = Fail("A permanent re-schedule of this class is already waiting for Operations.");
            duplicate.AlreadyPending = true;
            return duplicate;
        }

        var change = NewSlotChange(source.SalesDetailsId, newStart, newEnd);
        var moving = await ClassesToMoveAsync(source.detail, track: false);
        var check = await AddWeeklyDayChangeAsync(change, userId, dryRun: true, ignoreClassIds: moving.Select(c => c.ScheduleDetailsId).ToList());
        if (!check.Succeeded) return Fail(check.Message);

        var entity = new ScheduleChangeRequest
        {
            Id = Guid.NewGuid(),
            SalesDetailsId = source.SalesDetailsId,
            RequestedBy = userId,
            RequesterType = requesterType,
            FromDate = change.FromDate,
            Days = string.Join(",", change.Days),
            StartTime = change.StartTime,
            EndTime = change.EndTime,
            Weeks = WeeklyDayChangePlanner.PermanentWeeks,
            Summary = $"Permanent re-schedule: the {source.detail.StartTime:dddd hh:mm tt} class moves to " +
                      $"{newStart:dddd hh:mm tt} - {newEnd:hh:mm tt} from {newStart:dd-MMM-yyyy}",
            Status = (int)ClassStatusEditRequestStatus.Pending,
            CreatedDate = DateTime.UtcNow,
            RequestKind = PermanentRescheduleKind,
            ScheduleDetailsId = scheduleDetailsId,
        };
        _dbContext.ScheduleChangeRequest.Add(entity);
        await _dbContext.SaveChangesAsync();
        return new()
        {
            Succeeded = true,
            Message = "Permanent re-schedule sent to Operations for approval.",
            Request = await GetScheduleChangeRequestAsync(entity.Id),
        };
    }

    // Approved: the old weekly classes (from the requested class on) are removed and the new weekday/time is added
    // in the same save, exactly like Operations' "Permanent" change. Later months follow the new pattern.
    private async Task<WeeklyDayChangeResultDto> ApplyPermanentRescheduleAsync(ScheduleChangeRequest request)
    {
        var source = await _dbContext.ScheduleDetails.AsNoTracking().FirstOrDefaultAsync(d => d.ScheduleDetailsId == request.ScheduleDetailsId);
        if (source == null) return new() { Succeeded = false, Message = "The original class no longer exists." };

        var moving = await ClassesToMoveAsync(source, track: true);
        foreach (var item in moving)
        {
            item.IsActive = false;
            item.ModifiedBy = request.RequestedBy;
            item.ModifiedDate = DateTime.Now;
        }
        var change = NewSlotChange(request.SalesDetailsId, request.FromDate.Date + TimeSpan.Parse(request.StartTime),
            request.FromDate.Date + TimeSpan.Parse(request.EndTime));
        // AddWeeklyDayChangeAsync saves the removals above together with the new classes.
        var added = await AddWeeklyDayChangeAsync(change, request.RequestedBy, ignoreClassIds: moving.Select(c => c.ScheduleDetailsId).ToList());
        if (!added.Succeeded)
        {
            foreach (var item in moving) _dbContext.Entry(item).State = EntityState.Unchanged;
            foreach (var entry in _dbContext.ChangeTracker.Entries().Where(e => e.State == EntityState.Added).ToList())
                entry.State = EntityState.Detached;
            return added;
        }
        return new()
        {
            Succeeded = true,
            ClassDates = added.ClassDates,
            Message = $"{moving.Count} {source.StartTime:dddd hh:mm tt} class(es) removed; {added.Message}",
        };
    }

    private static WeeklyDayChangeRequestDto NewSlotChange(Guid salesDetailsId, DateTime newStart, DateTime newEnd) => new()
    {
        SalesDetailsId = salesDetailsId,
        FromDate = newStart.Date,
        Days = new List<int> { (int)newStart.DayOfWeek },
        StartTime = newStart.ToString("HH:mm"),
        EndTime = newEnd.ToString("HH:mm"),
        Weeks = WeeklyDayChangePlanner.PermanentWeeks,
    };

    // The class itself plus its later weekly repeats (same weekday and start time) that are not completed yet.
    private async Task<List<ScheduleDetails>> ClassesToMoveAsync(ScheduleDetails source, bool track)
    {
        var salesDetailsId = await _dbContext.Schedule.Where(s => s.ScheduleId == source.ScheduleId).Select(s => s.SalesDetailsId).FirstAsync();
        int[] completedCodes = { 1009001, 1009008, 1009009, 1009010 };
        var completedIds = await _dbContext.Type_Code.Where(c => completedCodes.Contains(c.TypeCodeValue)).Select(c => c.Id).ToListAsync();
        var query = from detail in _dbContext.ScheduleDetails
                    join schedule in _dbContext.Schedule on detail.ScheduleId equals schedule.ScheduleId
                    where schedule.SalesDetailsId == salesDetailsId && schedule.IsActive && schedule.ScheduleMode == WeeklyScheduleMode
                        && detail.IsActive && detail.ScheduleType == "Class" && detail.Date >= source.Date.Date
                    select detail;
        var candidates = track ? await query.ToListAsync() : await query.AsNoTracking().ToListAsync();
        bool Completed(ScheduleDetails d) =>
            (d.TutorScheduleStatus.HasValue && completedIds.Contains(d.TutorScheduleStatus.Value))
            || (d.OperationScheduleStatus.HasValue && completedIds.Contains(d.OperationScheduleStatus.Value))
            || AttendanceBillingRule.OpsCompleted(d.Status);
        return candidates.Where(d => d.ScheduleDetailsId == source.ScheduleDetailsId
                || (d.Date.DayOfWeek == source.Date.DayOfWeek && d.StartTime.TimeOfDay == source.StartTime.TimeOfDay && !Completed(d)))
            .ToList();
    }
    public async Task<ScheduleChangeRequestResultDto> CreateScheduleChangeRequestAsync(WeeklyDayChangeRequestDto request, Guid userId,
        string requesterType, string summary)
    {
        var days = string.Join(",", request.Days.Where(d => d >= 0 && d <= 6).Distinct().OrderBy(d => d));
        var duplicate = await _dbContext.ScheduleChangeRequest.AnyAsync(r => r.SalesDetailsId == request.SalesDetailsId
            && r.Status == (int)ClassStatusEditRequestStatus.Pending && r.FromDate == request.FromDate.Date && r.Days == days
            && r.StartTime == request.StartTime && r.EndTime == request.EndTime && r.Weeks == request.Weeks && r.RequestKind == null);
        if (duplicate) return new() { Succeeded = false, Message = "The same request is already waiting for Operations." };

        var entity = new ScheduleChangeRequest
        {
            Id = Guid.NewGuid(),
            SalesDetailsId = request.SalesDetailsId,
            RequestedBy = userId,
            RequesterType = requesterType,
            FromDate = request.FromDate.Date,
            Days = days,
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            Weeks = request.Weeks,
            Summary = summary.Length > 300 ? summary[..300] : summary,
            Status = (int)ClassStatusEditRequestStatus.Pending,
            CreatedDate = DateTime.UtcNow,
        };
        _dbContext.ScheduleChangeRequest.Add(entity);
        await _dbContext.SaveChangesAsync();
        return new()
        {
            Succeeded = true,
            Message = "Request sent to Operations. The class day(s) will be added once they approve.",
            Request = await GetScheduleChangeRequestAsync(entity.Id),
        };
    }

    // Newest first; Pending ones first of all.
    public async Task<List<ScheduleChangeRequestDto>> GetScheduleChangeRequestsAsync(Guid salesDetailsId)
    {
        var ids = await _dbContext.ScheduleChangeRequest.Where(r => r.SalesDetailsId == salesDetailsId)
            .OrderBy(r => r.Status == (int)ClassStatusEditRequestStatus.Pending ? 0 : 1).ThenByDescending(r => r.CreatedDate)
            .Take(20).Select(r => r.Id).ToListAsync();
        var result = new List<ScheduleChangeRequestDto>();
        foreach (var id in ids)
        {
            var dto = await GetScheduleChangeRequestAsync(id);
            if (dto != null) result.Add(dto);
        }
        return result;
    }

    // Requests page: all requests (salesDetailsIds null, Operations) or those of the given enrolments (tutor/student).
    public async Task<List<ScheduleChangeRequestDto>> GetScheduleChangeRequestListAsync(List<Guid>? salesDetailsIds, bool pendingOnly)
    {
        var query = _dbContext.ScheduleChangeRequest.AsQueryable();
        if (salesDetailsIds != null) query = query.Where(r => salesDetailsIds.Contains(r.SalesDetailsId));
        if (pendingOnly) query = query.Where(r => r.Status == (int)ClassStatusEditRequestStatus.Pending);
        var ids = await query.OrderBy(r => r.Status == (int)ClassStatusEditRequestStatus.Pending ? 0 : 1)
            .ThenByDescending(r => r.CreatedDate).Take(200).Select(r => r.Id).ToListAsync();
        var result = new List<ScheduleChangeRequestDto>();
        foreach (var id in ids)
        {
            var dto = await GetScheduleChangeRequestAsync(id);
            if (dto != null) result.Add(dto);
        }
        return result;
    }

    public async Task<ScheduleChangeRequestDto?> GetScheduleChangeRequestAsync(Guid id)
    {
        var request = await _dbContext.ScheduleChangeRequest.AsNoTracking().FirstOrDefaultAsync(r => r.Id == id);
        if (request == null) return null;

        var row = await (from details in _dbContext.SalesDetails
                         join sales in _dbContext.Sales on details.SalesId equals sales.Id
                         join student in _dbContext.Student on sales.StudentId equals student.Id
                         where details.Id == request.SalesDetailsId
                         select new { details.TutorId, details.SubjectId, student.UserId }).FirstOrDefaultAsync();
        // SalesDetails.TutorId holds either the Tutor.Id or the tutor's User.Id.
        var tutor = row?.TutorId == null ? null
            : await _dbContext.Tutor.AsNoTracking().FirstOrDefaultAsync(t => t.Id == row.TutorId || t.UserId == row.TutorId);
        var userIds = new[] { request.RequestedBy, row?.UserId ?? Guid.Empty, tutor?.UserId ?? Guid.Empty };
        var users = await _dbContext.User.AsNoTracking().Where(u => userIds.Contains(u.Id)).ToListAsync();
        string Name(Guid? userId) => users.Where(u => u.Id == userId).Select(u => u.FullName ?? $"{u.FirstName} {u.LastName}").FirstOrDefault() ?? "";
        var subject = row == null ? "" : await _dbContext.Type_Code.Where(c => c.Id == row.SubjectId).Select(c => c.TypeCodeName).FirstOrDefaultAsync() ?? "";

        return new ScheduleChangeRequestDto
        {
            Id = request.Id,
            SalesDetailsId = request.SalesDetailsId,
            TutorId = tutor?.Id,
            RequestedBy = request.RequestedBy,
            RequesterType = request.RequesterType,
            RequesterName = Name(request.RequestedBy),
            StudentName = Name(row?.UserId),
            TutorName = Name(tutor?.UserId),
            Subject = subject,
            FromDate = request.FromDate,
            Days = request.Days.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(int.Parse).ToList(),
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            Weeks = request.Weeks,
            Summary = request.Summary,
            Status = ((ClassStatusEditRequestStatus)request.Status).ToString(),
            DecisionComment = request.DecisionComment,
            CreatedDate = request.CreatedDate,
            RequestKind = request.RequestKind,
            ScheduleDetailsId = request.ScheduleDetailsId,
        };
    }

    // Approve: add the classes now (same checks as when the request was made; a clash since then stops it).
    public async Task<ScheduleChangeRequestResultDto> DecideScheduleChangeRequestAsync(Guid id, bool approve, Guid decidedBy, string? comment)
    {
        var request = await _dbContext.ScheduleChangeRequest.FirstOrDefaultAsync(r => r.Id == id);
        if (request == null) return new() { Succeeded = false, Message = "Request not found." };
        if (request.Status != (int)ClassStatusEditRequestStatus.Pending)
            return new() { Succeeded = false, Message = $"This request has already been {((ClassStatusEditRequestStatus)request.Status).ToString().ToLower()}." };

        var message = "Request rejected.";
        if (approve && request.RequestKind == PermanentRescheduleKind)
        {
            var moved = await ApplyPermanentRescheduleAsync(request);
            if (!moved.Succeeded)
                return new() { Succeeded = false, Message = $"Could not move the classes: {moved.Message} You can reject this request." };
            request.Summary = moved.Message.Length > 300 ? moved.Message[..300] : moved.Message;
            message = moved.Message;
        }
        else if (approve)
        {
            var added = await AddWeeklyDayChangeAsync(new WeeklyDayChangeRequestDto
            {
                SalesDetailsId = request.SalesDetailsId,
                FromDate = request.FromDate,
                Days = request.Days.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(int.Parse).ToList(),
                StartTime = request.StartTime,
                EndTime = request.EndTime,
                Weeks = request.Weeks,
            }, request.RequestedBy);
            if (!added.Succeeded)
                return new() { Succeeded = false, Message = $"Could not add the classes: {added.Message} You can reject this request." };
            request.Summary = added.Message.Length > 300 ? added.Message[..300] : added.Message;
            message = added.Message;
        }

        request.Status = (int)(approve ? ClassStatusEditRequestStatus.Approved : ClassStatusEditRequestStatus.Rejected);
        request.DecidedBy = decidedBy;
        request.DecidedDate = DateTime.UtcNow;
        request.DecisionComment = string.IsNullOrWhiteSpace(comment) ? null : comment.Trim()[..Math.Min(comment.Trim().Length, 500)];
        await _dbContext.SaveChangesAsync();
        return new() { Succeeded = true, Message = message, Request = await GetScheduleChangeRequestAsync(id) };
    }
}
