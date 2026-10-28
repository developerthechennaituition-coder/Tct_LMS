using Common;
using Microsoft.EntityFrameworkCore;
using TCT.LMS.Application.Services;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Schedule;

namespace TCT.LMS.Infrastructure.Repositories;

// Schedule Calendar: view a student's classes with a tutor and add weekday(s) for 1-4 weeks or permanently.
// Schedule.TutorId and SalesDetails.TutorId hold either the Tutor.Id or the tutor's User.Id, so both are matched.
public partial class ScheduleRepository
{
    private const string WeeklyScheduleMode = "Weekly";

    public async Task<List<ScheduleCalendarTutorDto>> GetScheduleCalendarTutorsAsync()
    {
        var tutorKeys = await _dbContext.SalesDetails.Where(s => s.IsActive && s.TutorId != null)
            .Select(s => s.TutorId!.Value).Distinct().ToListAsync();
        return await (from tutor in _dbContext.Tutor
                      join user in _dbContext.User on tutor.UserId equals user.Id
                      where tutor.IsActive && (tutorKeys.Contains(tutor.Id) || tutorKeys.Contains(tutor.UserId))
                      orderby user.FullName
                      select new ScheduleCalendarTutorDto { TutorId = tutor.Id, Name = user.FullName ?? (user.FirstName + " " + user.LastName) })
                     .ToListAsync();
    }

    // tutorId: Tutor.Id (Operations' choice). Or restrict to one tutor/student user (their own view).
    public async Task<List<ScheduleCalendarEnrolmentDto>> GetScheduleCalendarEnrolmentsAsync(Guid? tutorId, Guid? tutorUserId, Guid? studentUserId)
    {
        var tutor = tutorId.HasValue ? await _dbContext.Tutor.FirstOrDefaultAsync(t => t.Id == tutorId.Value)
            : tutorUserId.HasValue ? await _dbContext.Tutor.FirstOrDefaultAsync(t => t.UserId == tutorUserId.Value) : null;
        if ((tutorId.HasValue || tutorUserId.HasValue) && tutor == null) return new();

        var rows = await (from details in _dbContext.SalesDetails
                          join sales in _dbContext.Sales on details.SalesId equals sales.Id
                          join student in _dbContext.Student on sales.StudentId equals student.Id
                          join user in _dbContext.User on student.UserId equals user.Id
                          where details.IsActive
                              && (tutor == null || details.TutorId == tutor.Id || details.TutorId == tutor.UserId)
                              && (studentUserId == null || student.UserId == studentUserId)
                              && _dbContext.Schedule.Any(s => s.SalesDetailsId == details.Id && s.IsActive)
                          select new { details.Id, details.TutorId, details.SubjectId, StudentId = student.Id, StudentName = user.FullName ?? (user.FirstName + " " + user.LastName) })
                         .ToListAsync();

        var tutorKeys = rows.Where(r => r.TutorId.HasValue).Select(r => r.TutorId!.Value).Distinct().ToList();
        var tutorNames = await (from t in _dbContext.Tutor
                                join u in _dbContext.User on t.UserId equals u.Id
                                where tutorKeys.Contains(t.Id) || tutorKeys.Contains(t.UserId)
                                select new { t.Id, t.UserId, Name = u.FullName ?? (u.FirstName + " " + u.LastName) }).ToListAsync();
        var subjectIds = rows.Select(r => r.SubjectId).Distinct().ToList();
        var subjects = await _dbContext.Type_Code.Where(c => subjectIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id, c => c.TypeCodeName);

        var result = new List<ScheduleCalendarEnrolmentDto>();
        foreach (var row in rows.OrderBy(r => r.StudentName))
        {
            var weekly = await LatestWeeklyScheduleAsync(row.Id);
            var pattern = "";
            if (weekly != null)
            {
                var classes = await _dbContext.ScheduleDetails.Where(d => d.ScheduleId == weekly.ScheduleId && d.IsActive && d.ScheduleType == "Class")
                    .Select(d => new { d.Date, d.StartTime }).ToListAsync();
                pattern = string.Join(", ", classes
                    .GroupBy(c => new { c.Date.DayOfWeek, c.StartTime.TimeOfDay })
                    .OrderBy(g => ((int)g.Key.DayOfWeek + 6) % 7).ThenBy(g => g.Key.TimeOfDay)
                    .Select(g => $"{g.Key.DayOfWeek.ToString()[..3]} {DateTime.Today.Add(g.Key.TimeOfDay):hh:mm tt}"));
            }
            result.Add(new ScheduleCalendarEnrolmentDto
            {
                SalesDetailsId = row.Id,
                StudentId = row.StudentId,
                StudentName = row.StudentName,
                TutorName = tutorNames.FirstOrDefault(t => t.Id == row.TutorId || t.UserId == row.TutorId)?.Name ?? "",
                Subject = subjects.TryGetValue(row.SubjectId, out var subject) ? subject ?? "" : "",
                WeeklyPattern = pattern,
                HasWeeklySchedule = weekly != null,
            });
        }
        return result;
    }

    // This enrolment's classes, plus the tutor's and student's other bookings (shown as busy).
    public async Task<List<ScheduleCalendarEventDto>> GetScheduleCalendarEventsAsync(Guid salesDetailsId, DateTime fromDate, DateTime toDate)
    {
        var details = await _dbContext.SalesDetails.FirstOrDefaultAsync(s => s.Id == salesDetailsId);
        if (details == null) return new();
        var studentId = await _dbContext.Sales.Where(s => s.Id == details.SalesId).Select(s => s.StudentId).FirstOrDefaultAsync();
        var tutorKeys = await TutorKeysAsync(details.TutorId);
        var end = toDate.Date.AddDays(1);

        var rows = await (from schedule in _dbContext.Schedule
                          join detail in _dbContext.ScheduleDetails on schedule.ScheduleId equals detail.ScheduleId
                          where schedule.IsActive && detail.IsActive && detail.Date >= fromDate.Date && detail.Date < end
                              && (schedule.SalesDetailsId == salesDetailsId || schedule.StudentId == studentId || tutorKeys.Contains(schedule.TutorId))
                          select new { schedule.SalesDetailsId, schedule.StudentId, schedule.ScheduleMode, detail.ScheduleDetailsId,
                              detail.StartTime, detail.EndTime, detail.ScheduleType, detail.Status })
                         .ToListAsync();

        return rows.Select(r => new ScheduleCalendarEventDto
        {
            ScheduleDetailsId = r.SalesDetailsId == salesDetailsId ? r.ScheduleDetailsId : null,
            Start = r.StartTime,
            End = r.EndTime,
            Kind = r.SalesDetailsId != salesDetailsId ? (r.StudentId == studentId ? "StudentBusy" : "TutorBusy")
                : r.ScheduleMode == WeeklyDayChangePlanner.TemporaryScheduleMode ? "Temporary"
                : r.ScheduleMode == WeeklyScheduleMode ? "Regular" : "OneTime",
            Status = r.SalesDetailsId == salesDetailsId ? (r.ScheduleType == "Demo" ? "Demo" : r.Status) : null,
        }).OrderBy(e => e.Start).ToList();
    }

    // dryRun: run every check and report what would be added, without saving (tutor/student requests).
    // ignoreClassIds: classes left out of the clash check (a permanent re-schedule moves them away in the same save).
    public async Task<WeeklyDayChangeResultDto> AddWeeklyDayChangeAsync(WeeklyDayChangeRequestDto request, Guid actorId, bool dryRun = false,
        IReadOnlyCollection<Guid>? ignoreClassIds = null)
    {
        WeeklyDayChangeResultDto Fail(string message) => new() { Succeeded = false, Message = message };

        if (!TimeSpan.TryParse(request.StartTime, out var start) || !TimeSpan.TryParse(request.EndTime, out var end))
            return Fail("Enter a valid start and end time.");
        var days = request.Days.Where(d => d >= 0 && d <= 6).Distinct().Select(d => (DayOfWeek)d).ToList();
        var today = DateHelper.TCTConvertTimeFromUtc(DateTime.UtcNow).Date;
        var invalid = WeeklyDayChangePlanner.Validate(request.FromDate, days, start, end, request.Weeks, today);
        if (invalid != null) return Fail(invalid);

        var details = await _dbContext.SalesDetails.FirstOrDefaultAsync(s => s.Id == request.SalesDetailsId && s.IsActive);
        if (details == null) return Fail("Enrolment not found.");
        var weekly = await LatestWeeklyScheduleAsync(details.Id);
        var anySchedule = weekly ?? await _dbContext.Schedule.Where(s => s.SalesDetailsId == details.Id && s.IsActive)
            .OrderByDescending(s => s.StartDate).FirstOrDefaultAsync();
        if (anySchedule == null) return Fail("This student has no schedule with this tutor yet. Schedule the regular classes first.");

        var permanent = request.Weeks == WeeklyDayChangePlanner.PermanentWeeks;
        List<Schedule> weeklySchedules = new();
        var permanentUntil = DateTime.MinValue;
        if (permanent)
        {
            if (weekly == null) return Fail("Permanent changes need a regular weekly schedule. Use 1-4 weeks instead.");
            // Up to the last month already scheduled; later months copy the new weekly pattern on rollover.
            weeklySchedules = await _dbContext.Schedule.Where(s => s.SalesDetailsId == details.Id && s.IsActive
                && s.ScheduleMode == WeeklyScheduleMode && s.EndDate >= request.FromDate.Date).ToListAsync();
            if (weeklySchedules.Count == 0) return Fail("No regular weekly schedule covers the chosen start date.");
            permanentUntil = weeklySchedules.Max(s => s.EndDate);
            if (weekly.ScheduleEndDate.HasValue && weekly.ScheduleEndDate.Value < permanentUntil) permanentUntil = weekly.ScheduleEndDate.Value;
        }

        var lastDate = WeeklyDayChangePlanner.LastDate(request.FromDate, request.Weeks, permanentUntil);
        var occurrences = WeeklyDayChangePlanner.Occurrences(request.FromDate, lastDate, days, start, end);
        if (occurrences.Count == 0) return Fail("None of the chosen days fall in that period.");

        var packageBlock = await GetPrepaidScheduleBlockReasonAsync(details.Id, occurrences[0].Start.Date);
        if (packageBlock != null) return Fail(packageBlock);

        // The tutor (any enrolment) and the student (any subject) must be free at every new class time.
        var studentId = await _dbContext.Sales.Where(s => s.Id == details.SalesId).Select(s => s.StudentId).FirstOrDefaultAsync();
        var tutorKeys = await TutorKeysAsync(details.TutorId ?? anySchedule.TutorId);
        var periodEnd = lastDate.Date.AddDays(1);
        var ignored = ignoreClassIds?.ToList() ?? new List<Guid>();
        var booked = await (from schedule in _dbContext.Schedule
                            join detail in _dbContext.ScheduleDetails on schedule.ScheduleId equals detail.ScheduleId
                            where schedule.IsActive && detail.IsActive && detail.Date >= request.FromDate.Date && detail.Date < periodEnd
                                && (schedule.StudentId == studentId || tutorKeys.Contains(schedule.TutorId))
                                && !ignored.Contains(detail.ScheduleDetailsId)
                            select new { detail.StartTime, detail.EndTime, schedule.StudentId, schedule.TutorId }).ToListAsync();
        var bookedEvents = booked.Where(b => b.StartTime < b.EndTime).Select(b => new EventSlotValidator.Event(b.StartTime, b.EndTime)).ToList();
        var clash = occurrences.FirstOrDefault(o => EventSlotValidator.IsSlotAllocated(bookedEvents, o.Start, o.End));
        if (clash != default)
        {
            // Who is busy at the clashing time (both when it is this enrolment's own class).
            var overlapping = booked.Where(b => b.StartTime < clash.End && b.EndTime > clash.Start).ToList();
            var refused = Fail($"The tutor or the student already has a class on {clash.Start:ddd dd-MMM-yyyy hh:mm tt}. Choose another time.");
            refused.ClashStart = clash.Start;
            refused.ClashEnd = clash.End;
            refused.TutorBusy = overlapping.Any(b => tutorKeys.Contains(b.TutorId));
            refused.StudentBusy = overlapping.Any(b => b.StudentId == studentId);
            return refused;
        }

        if (dryRun)
        {
            var plannedDays = string.Join(", ", days.OrderBy(d => ((int)d + 6) % 7).Select(d => d.ToString()));
            return new WeeklyDayChangeResultDto
            {
                Succeeded = true,
                ClassDates = occurrences.Select(o => o.Start).ToList(),
                Message = $"{occurrences.Count} class(es) on {plannedDays} at {request.StartTime}-{request.EndTime} " +
                          $"from {request.FromDate:dd-MMM-yyyy} ({WeeklyDayChangePlanner.DurationLabel(request.Weeks)})",
            };
        }

        var sample = await _dbContext.ScheduleDetails.Where(d => d.ScheduleId == anySchedule.ScheduleId && d.IsActive)
            .OrderByDescending(d => d.Date).FirstOrDefaultAsync();

        using var transaction = await _dbContext.Database.BeginTransactionAsync();
        var created = new List<DateTime>();
        if (permanent)
        {
            foreach (var occurrence in occurrences)
            {
                var target = weeklySchedules.FirstOrDefault(s => s.StartDate.Date <= occurrence.Start.Date && s.EndDate.Date >= occurrence.Start.Date);
                if (target == null) continue;
                _dbContext.ScheduleDetails.Add(NewClass(target.ScheduleId, occurrence, sample, actorId));
                created.Add(occurrence.Start);
            }
            if (created.Count == 0) return Fail("No regular weekly schedule covers the chosen dates.");
        }
        else
        {
            var header = new Schedule
            {
                ScheduleId = Guid.NewGuid(),
                SalesDetailsId = details.Id,
                TutorId = anySchedule.TutorId,
                StudentId = anySchedule.StudentId,
                SubjectId = anySchedule.SubjectId,
                StartDate = occurrences[0].Start.Date,
                EndDate = occurrences[^1].Start.Date,
                Title = anySchedule.Title,
                MeetingLink = anySchedule.MeetingLink,
                ScheduleMode = WeeklyDayChangePlanner.TemporaryScheduleMode,
                TotalClasses = occurrences.Count,
                // Same Accounts approval as the regular schedule, so invoicing is not held up by this change.
                AccountsApprovalScheduleStatus = anySchedule.AccountsApprovalScheduleStatus,
                IsActive = true,
                CreatedBy = actorId,
                CreatedDate = DateTime.Now,
            };
            _dbContext.Schedule.Add(header);
            foreach (var occurrence in occurrences)
            {
                _dbContext.ScheduleDetails.Add(NewClass(header.ScheduleId, occurrence, sample, actorId));
                created.Add(occurrence.Start);
            }
        }
        await _dbContext.SaveChangesAsync();
        await transaction.CommitAsync();

        var dayNames = string.Join(", ", days.OrderBy(d => ((int)d + 6) % 7).Select(d => d.ToString()));
        return new WeeklyDayChangeResultDto
        {
            Succeeded = true,
            ClassDates = created,
            Message = $"{created.Count} class(es) added on {dayNames} ({WeeklyDayChangePlanner.DurationLabel(request.Weeks)})"
                + (permanent ? $" up to {created[^1]:dd-MMM-yyyy}; later months follow the new weekly pattern." : "."),
        };
    }

    private static ScheduleDetails NewClass(Guid scheduleId, (DateTime Start, DateTime End) occurrence, ScheduleDetails? sample, Guid actorId) => new()
    {
        ScheduleDetailsId = Guid.NewGuid(),
        ScheduleId = scheduleId,
        Date = occurrence.Start.Date,
        StartTime = occurrence.Start,
        EndTime = occurrence.End,
        ScheduleType = "Class",
        Title = sample?.Title,
        MeetingLink = sample?.MeetingLink,
        IsActive = true,
        CreatedBy = actorId,
        CreatedDate = DateTime.Now,
    };

    private Task<Schedule?> LatestWeeklyScheduleAsync(Guid salesDetailsId) =>
        _dbContext.Schedule.Where(s => s.SalesDetailsId == salesDetailsId && s.IsActive && s.ScheduleMode == WeeklyScheduleMode)
            .OrderByDescending(s => s.StartDate).FirstOrDefaultAsync();

    // Both ids a tutor may be stored under (Tutor.Id and the tutor's User.Id).
    private async Task<List<Guid>> TutorKeysAsync(Guid? tutorKey)
    {
        if (!tutorKey.HasValue || tutorKey.Value == Guid.Empty) return new();
        var tutor = await _dbContext.Tutor.FirstOrDefaultAsync(t => t.Id == tutorKey.Value || t.UserId == tutorKey.Value);
        return tutor == null ? new() { tutorKey.Value } : new() { tutor.Id, tutor.UserId };
    }
}
