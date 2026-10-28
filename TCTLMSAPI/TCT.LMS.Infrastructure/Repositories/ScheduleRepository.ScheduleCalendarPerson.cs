using Microsoft.EntityFrameworkCore;
using TCT.LMS.Application.Services;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Schedule;

namespace TCT.LMS.Infrastructure.Repositories;

// Schedule Calendar for Operations: a tutor's calendar and a student's calendar, chosen independently, and
// "Modify" on a tutor's/student's request (Operations change it, then it is approved with the same checks).
public partial class ScheduleRepository
{
    // Students who have at least one scheduled enrolment (Student.Id).
    public async Task<List<ScheduleCalendarStudentDto>> GetScheduleCalendarStudentsAsync() =>
        await (from student in _dbContext.Student
               join user in _dbContext.User on student.UserId equals user.Id
               where student.IsActive
                   && (from sales in _dbContext.Sales
                       join details in _dbContext.SalesDetails on sales.Id equals details.SalesId
                       where sales.StudentId == student.Id && details.IsActive
                           && _dbContext.Schedule.Any(s => s.SalesDetailsId == details.Id && s.IsActive)
                       select details.Id).Any()
               orderby user.FullName
               select new ScheduleCalendarStudentDto { StudentId = student.Id, Name = user.FullName ?? (user.FirstName + " " + user.LastName) })
              .ToListAsync();

    // Every class of one tutor (tutorId = Tutor.Id) or one student (studentId = Student.Id) in the range.
    public async Task<List<ScheduleCalendarPersonEventDto>> GetScheduleCalendarPersonEventsAsync(Guid? tutorId, Guid? studentId,
        DateTime fromDate, DateTime toDate)
    {
        var tutorKeys = tutorId.HasValue ? await TutorKeysAsync(tutorId) : new List<Guid>();
        if (tutorId.HasValue && tutorKeys.Count == 0) return new();
        if (!tutorId.HasValue && !studentId.HasValue) return new();
        var end = toDate.Date.AddDays(1);

        var rows = await (from schedule in _dbContext.Schedule
                          join detail in _dbContext.ScheduleDetails on schedule.ScheduleId equals detail.ScheduleId
                          join details in _dbContext.SalesDetails on schedule.SalesDetailsId equals details.Id
                          where schedule.IsActive && detail.IsActive && detail.Date >= fromDate.Date && detail.Date < end
                              && (tutorId.HasValue ? tutorKeys.Contains(schedule.TutorId) : schedule.StudentId == studentId)
                          select new { detail.ScheduleDetailsId, schedule.SalesDetailsId, schedule.StudentId, schedule.TutorId,
                              schedule.ScheduleMode, detail.StartTime, detail.EndTime, detail.ScheduleType, detail.Status, details.SubjectId })
                         .ToListAsync();
        if (rows.Count == 0) return new();

        var subjectIds = rows.Select(r => r.SubjectId).Distinct().ToList();
        var subjects = await _dbContext.Type_Code.Where(c => subjectIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id, c => c.TypeCodeName);
        Dictionary<Guid, string> names;
        if (tutorId.HasValue)
        {
            var studentIds = rows.Select(r => r.StudentId).Distinct().ToList();
            names = await (from student in _dbContext.Student
                           join user in _dbContext.User on student.UserId equals user.Id
                           where studentIds.Contains(student.Id)
                           select new { student.Id, Name = user.FullName ?? (user.FirstName + " " + user.LastName) })
                          .ToDictionaryAsync(x => x.Id, x => x.Name);
        }
        else
        {
            // Schedule.TutorId holds either the Tutor.Id or the tutor's User.Id: index both.
            var keys = rows.Select(r => r.TutorId).Distinct().ToList();
            var tutors = await (from tutor in _dbContext.Tutor
                                join user in _dbContext.User on tutor.UserId equals user.Id
                                where keys.Contains(tutor.Id) || keys.Contains(tutor.UserId)
                                select new { tutor.Id, tutor.UserId, Name = user.FullName ?? (user.FirstName + " " + user.LastName) })
                               .ToListAsync();
            names = new Dictionary<Guid, string>();
            foreach (var t in tutors) { names[t.Id] = t.Name; names[t.UserId] = t.Name; }
        }

        return rows.Select(r => new ScheduleCalendarPersonEventDto
        {
            ScheduleDetailsId = r.ScheduleDetailsId,
            SalesDetailsId = r.SalesDetailsId,
            Start = r.StartTime,
            End = r.EndTime,
            Kind = r.ScheduleType == "Demo" ? "Demo"
                : r.ScheduleMode == WeeklyDayChangePlanner.TemporaryScheduleMode ? "Temporary"
                : r.ScheduleMode == WeeklyScheduleMode ? "Regular" : "OneTime",
            Status = r.Status,
            Subject = subjects.TryGetValue(r.SubjectId, out var subject) ? subject ?? "" : "",
            OtherName = names.TryGetValue(tutorId.HasValue ? r.StudentId : r.TutorId, out var name) ? name : "",
        }).OrderBy(e => e.Start).ToList();
    }

    // Operations change a pending "add class days" request (days, times, from date, weeks), then approve it.
    // The original request is kept in the decision comment. Permanent re-schedule requests cannot be modified.
    public async Task<ScheduleChangeRequestResultDto> ModifyAndApproveScheduleChangeRequestAsync(Guid id, WeeklyDayChangeRequestDto change,
        Guid decidedBy, string? comment)
    {
        var request = await _dbContext.ScheduleChangeRequest.FirstOrDefaultAsync(r => r.Id == id);
        if (request == null) return new() { Succeeded = false, Message = "Request not found." };
        if (request.Status != (int)ClassStatusEditRequestStatus.Pending)
            return new() { Succeeded = false, Message = $"This request has already been {((ClassStatusEditRequestStatus)request.Status).ToString().ToLower()}." };
        if (request.RequestKind == PermanentRescheduleKind)
            return new() { Succeeded = false, Message = "A permanent re-schedule request can only be approved or rejected." };
        if (change.SalesDetailsId != request.SalesDetailsId)
            return new() { Succeeded = false, Message = "The subject of a request cannot be changed." };

        // Validate the modified values first (no save), so a refused change leaves the request untouched.
        var check = await AddWeeklyDayChangeAsync(change, request.RequestedBy, dryRun: true);
        if (!check.Succeeded) return new() { Succeeded = false, Message = check.Message };

        // Not saved here: DecideScheduleChangeRequestAsync reads this tracked request and saves the new values
        // together with the approval; if approval fails nothing is saved and the request stays as it was asked.
        var originalSummary = request.Summary;
        request.FromDate = change.FromDate.Date;
        request.Days = string.Join(",", change.Days.Where(d => d >= 0 && d <= 6).Distinct().OrderBy(d => d));
        request.StartTime = change.StartTime;
        request.EndTime = change.EndTime;
        request.Weeks = change.Weeks;

        var note = $"Modified by Operations. Requested: {originalSummary}."
                   + (string.IsNullOrWhiteSpace(comment) ? "" : $" {comment.Trim()}");
        return await DecideScheduleChangeRequestAsync(id, true, decidedBy, note.Length > 500 ? note[..500] : note);
    }
}
