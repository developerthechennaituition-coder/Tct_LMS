using Microsoft.EntityFrameworkCore;
using TCT.LMS.Application.Services;
using TCT.LMS.Domain;
using TCT.LMS.DTOs.Schedule;

namespace TCT.LMS.Infrastructure.Repositories;

public partial class ScheduleRepository
{
    // Start times of the student's regular classes in the month that take place but are not yet
    // cross-checked by Operations (AttendanceBillingRule.IsAwaitingCrossCheck). Prepaid schedules are skipped.
    private async Task<List<DateTime>> GetClassesAwaitingCrossCheckAsync(Guid studentId, DateTime monthStart, List<Guid> excludedScheduleIds)
    {
        var monthEnd = monthStart.AddMonths(1);
        var lookupCodes = AttendanceBillingRule.NotTakingPlaceStatusCodes.Concat(AttendanceBillingRule.CrossCheckCodes).ToList();
        var codeById = await _dbContext.Type_Code
            .Where(c => lookupCodes.Contains(c.TypeCodeValue))
            .Select(c => new { c.Id, c.TypeCodeValue, c.TypeCodeName }).ToListAsync();
        var notTakingPlaceNames = codeById.Where(c => AttendanceBillingRule.NotTakingPlaceStatusCodes.Contains(c.TypeCodeValue))
            .Select(c => c.TypeCodeName.Trim()).ToList();
        int? Code(Guid? id) => id.HasValue ? codeById.FirstOrDefault(c => c.Id == id.Value)?.TypeCodeValue : null;

        var classes = await (
            from detail in _dbContext.ScheduleDetails
            join schedule in _dbContext.Schedule on detail.ScheduleId equals schedule.ScheduleId
            join salesDetails in _dbContext.SalesDetails on schedule.SalesDetailsId equals salesDetails.Id
            where schedule.StudentId == studentId && schedule.IsActive && salesDetails.IsActive && detail.IsActive
                && detail.ScheduleType != "Demo" && detail.Date >= monthStart && detail.Date < monthEnd
                && !excludedScheduleIds.Contains(schedule.ScheduleId)
            select new { detail.StartTime, detail.TutorScheduleStatus, detail.OperationScheduleStatus, detail.Status })
            .ToListAsync();

        return classes
            .Where(c => AttendanceBillingRule.IsAwaitingCrossCheck(Code(c.OperationScheduleStatus),
                AttendanceBillingRule.IsNotTakingPlace(c.Status, notTakingPlaceNames, Code(c.TutorScheduleStatus))))
            .Select(c => c.StartTime).OrderBy(start => start).ToList();
    }

    // Due Timings: each student's subject (enrolment) with the share of the month's regular classes completed,
    // using the same rules as GetMonthlyClassCompletionAsync. Enrolments with no classes taking place are left out.
    public async Task<List<ClassCompletionRowDto>> GetClassCompletionListAsync(int month, int year)
    {
        int[] completedCodes = { 1009001, 1009008, 1009009, 1009010 };
        int[] notTakingPlaceCodes = { 1009002, 1009003, 1009005, 1009006, 1009007 };
        var completedIds = await _dbContext.Type_Code.Where(c => completedCodes.Contains(c.TypeCodeValue)).Select(c => c.Id).ToListAsync();
        var notTakingPlaceIds = await _dbContext.Type_Code.Where(c => notTakingPlaceCodes.Contains(c.TypeCodeValue)).Select(c => c.Id).ToListAsync();
        bool Has(Guid? status, List<Guid> ids) => status.HasValue && ids.Contains(status.Value);

        var monthStart = new DateTime(year, month, 1);
        var monthEnd = monthStart.AddMonths(1);
        var classes = await (
            from detail in _dbContext.ScheduleDetails
            join schedule in _dbContext.Schedule on detail.ScheduleId equals schedule.ScheduleId
            join salesDetails in _dbContext.SalesDetails on schedule.SalesDetailsId equals salesDetails.Id
            join sales in _dbContext.Sales on salesDetails.SalesId equals sales.Id
            where schedule.IsActive && salesDetails.IsActive && detail.IsActive
                && detail.ScheduleType != "Demo" && detail.Date >= monthStart && detail.Date < monthEnd
            select new
            {
                schedule.SalesDetailsId, schedule.ScheduleId, schedule.StudentId, schedule.TutorId,
                salesDetails.SubjectId, sales.BoardId, sales.GradeId,
                detail.TutorScheduleStatus, detail.OperationScheduleStatus, detail.Status
            }).ToListAsync();
        if (classes.Count == 0) return new List<ClassCompletionRowDto>();

        var studentIds = classes.Select(c => c.StudentId).Distinct().ToList();
        var students = await (from student in _dbContext.Student
                              join user in _dbContext.User on student.UserId equals user.Id
                              where studentIds.Contains(student.Id)
                              select new { student.Id, UserId = user.Id, Name = user.FullName ?? (user.FirstName + " " + user.LastName) })
                             .ToDictionaryAsync(s => s.Id);
        // Schedule.TutorId holds either the Tutor.Id or the tutor's User.Id.
        var tutorKeys = classes.Select(c => c.TutorId).Distinct().ToList();
        var tutors = await (from tutor in _dbContext.Tutor
                            join user in _dbContext.User on tutor.UserId equals user.Id
                            where tutorKeys.Contains(tutor.Id) || tutorKeys.Contains(tutor.UserId)
                            select new { tutor.Id, tutor.UserId, Name = user.FullName ?? (user.FirstName + " " + user.LastName) })
                           .ToListAsync();
        var codeIds = classes.SelectMany(c => new Guid?[] { c.SubjectId, c.BoardId, c.GradeId })
            .Where(id => id.HasValue).Select(id => id!.Value).Distinct().ToList();
        var codeNames = await _dbContext.Type_Code.Where(c => codeIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id, c => c.TypeCodeName);
        string CodeName(Guid? id) => id.HasValue && codeNames.TryGetValue(id.Value, out var name) ? name ?? "" : "";
        var scheduleIds = classes.Select(c => c.ScheduleId).Distinct().ToList();
        var invoiced = await (from line in _dbContext.StudentInvoiceDetails
                              join invoice in _dbContext.StudentInvoice on line.StudentInvoiceId equals invoice.Id
                              where line.IsActive && invoice.IsActive && line.Month == month && line.Year == year
                                  && scheduleIds.Contains(line.ScheduleId)
                              select new { line.ScheduleId, invoice.InvoiceNumber }).ToListAsync();

        return classes.GroupBy(c => c.SalesDetailsId).Select(group =>
        {
            var first = group.First();
            var takingPlace = group.Where(c => !Has(c.TutorScheduleStatus, notTakingPlaceIds) && !Has(c.OperationScheduleStatus, notTakingPlaceIds)).ToList();
            var completed = takingPlace.Count(c => Has(c.TutorScheduleStatus, completedIds) || Has(c.OperationScheduleStatus, completedIds)
                || AttendanceBillingRule.OpsCompleted(c.Status));
            students.TryGetValue(first.StudentId, out var student);
            var tutor = tutors.FirstOrDefault(t => t.Id == first.TutorId || t.UserId == first.TutorId);
            var groupSchedules = group.Select(c => c.ScheduleId).Distinct().ToList();
            return new ClassCompletionRowDto
            {
                SalesDetailsId = group.Key,
                StudentId = first.StudentId,
                StudentUserId = student?.UserId,
                StudentName = student?.Name ?? "",
                TutorName = tutor?.Name ?? "",
                Subject = CodeName(first.SubjectId),
                Board = CodeName(first.BoardId),
                Grade = CodeName(first.GradeId),
                Month = month,
                Year = year,
                TotalClasses = takingPlace.Count,
                CompletedClasses = completed,
                CompletionPercent = takingPlace.Count == 0 ? 0 : Math.Round(completed * 100m / takingPlace.Count, 1),
                InvoiceNumber = invoiced.FirstOrDefault(i => groupSchedules.Contains(i.ScheduleId))?.InvoiceNumber,
            };
        })
        .Where(row => row.TotalClasses > 0)
        .OrderByDescending(row => row.CompletionPercent).ThenBy(row => row.StudentName).ToList();
    }

    // Completion of the month's regular classes for the enrolment (SalesDetails) of the given class.
    // A class is completed when the tutor or Operations recorded any "Class Completed" status.
    // Cancelled, postponed and rescheduled classes are left out of the total: they will not take place.
    public async Task<MonthlyClassCompletionDto?> GetMonthlyClassCompletionAsync(Guid scheduleDetailsId)
    {
        var target = await (
            from detail in _dbContext.ScheduleDetails
            join schedule in _dbContext.Schedule on detail.ScheduleId equals schedule.ScheduleId
            join salesDetails in _dbContext.SalesDetails on schedule.SalesDetailsId equals salesDetails.Id
            where detail.ScheduleDetailsId == scheduleDetailsId
            select new { schedule.SalesDetailsId, salesDetails.SalesId, detail.Date })
            .FirstOrDefaultAsync();
        if (target == null) return null;

        int[] completedCodes = { 1009001, 1009008, 1009009, 1009010 };
        int[] notTakingPlaceCodes = { 1009002, 1009003, 1009005, 1009006, 1009007 };
        var completedIds = await _dbContext.Type_Code.Where(c => completedCodes.Contains(c.TypeCodeValue)).Select(c => c.Id).ToListAsync();
        var notTakingPlaceIds = await _dbContext.Type_Code.Where(c => notTakingPlaceCodes.Contains(c.TypeCodeValue)).Select(c => c.Id).ToListAsync();

        var monthStart = new DateTime(target.Date.Year, target.Date.Month, 1);
        var monthEnd = monthStart.AddMonths(1);
        var classes = await (
            from detail in _dbContext.ScheduleDetails
            join schedule in _dbContext.Schedule on detail.ScheduleId equals schedule.ScheduleId
            where schedule.SalesDetailsId == target.SalesDetailsId && schedule.IsActive && detail.IsActive
                && detail.ScheduleType != "Demo" && detail.Date >= monthStart && detail.Date < monthEnd
            select new { detail.TutorScheduleStatus, detail.OperationScheduleStatus, detail.Status })
            .ToListAsync();

        bool Has(Guid? status, List<Guid> ids) => status.HasValue && ids.Contains(status.Value);
        var takingPlace = classes.Where(c => !Has(c.TutorScheduleStatus, notTakingPlaceIds) && !Has(c.OperationScheduleStatus, notTakingPlaceIds)).ToList();
        // Operations' own record (ScheduleDetails.Status) also counts: the cross-check replaces
        // OperationScheduleStatus with its approval code, and Operations no longer overwrite the tutor's status.
        bool IsCompleted(Guid? tutor, Guid? operation, string? opsStatus) =>
            Has(tutor, completedIds) || Has(operation, completedIds) || AttendanceBillingRule.OpsCompleted(opsStatus);

        var alreadyNotified = await (
            from notification in _dbContext.Notification
            join detail in _dbContext.ScheduleDetails on notification.ScheduleDetailsId equals detail.ScheduleDetailsId
            where notification.IsActive && notification.SalesDetailsId == target.SalesDetailsId
                && notification.NotificationType == (int)NotificationType.ClassCompletionThreshold
                && detail.Date >= monthStart && detail.Date < monthEnd
            select notification.Id).AnyAsync();

        return new MonthlyClassCompletionDto
        {
            SalesId = target.SalesId,
            SalesDetailsId = target.SalesDetailsId,
            Month = monthStart.Month,
            Year = monthStart.Year,
            CompletedClasses = takingPlace.Count(c => IsCompleted(c.TutorScheduleStatus, c.OperationScheduleStatus, c.Status)),
            TotalClasses = takingPlace.Count,
            AlreadyNotified = alreadyNotified,
        };
    }
}
