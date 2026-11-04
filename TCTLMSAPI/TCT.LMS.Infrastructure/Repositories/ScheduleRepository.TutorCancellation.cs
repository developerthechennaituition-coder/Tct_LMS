using Microsoft.EntityFrameworkCore;
using TCT.LMS.DTOs.Payroll;
using TCT.LMS.DTOs.Schedule;
using Common;
using TCT.LMS.Domain.Entities;
using Rules = TCT.LMS.Application.Services.TutorCancellationRules;

namespace TCT.LMS.Infrastructure.Repositories;

// Tutor class cancellations (TutorCancellationRules): the allowance summary shown before cancelling, and the make-up
// request for one cancelled class. A make-up is a Schedule Calendar request (kind CancelledClassMakeup) for a single
// class; Operations approve it like any other request, and the approval links the new class to the cancellation.
public partial class ScheduleRepository
{
    public const string CancelledClassMakeupKind = "CancelledClassMakeup";

    public async Task<TutorCancellationSummaryDto> GetTutorCancellationSummaryAsync(Guid salesDetailsId, DateTime classDate,
        Guid? excludeScheduleDetailsId)
    {
        // The allowance and usage are the course tutor's, across all their courses; the list is this course's classes.
        var tutor = await TutorCancellationTracker.CourseTutorAsync(_dbContext, salesDetailsId);
        var usage = await TutorCancellationTracker.UsageAsync(_dbContext, tutor, classDate, excludeScheduleDetailsId);
        var (config, _) = await TutorCancellationTracker.LoadConfigAsync(_dbContext);
        var tutorPending = tutor == null ? 0 : await _dbContext.TutorCancellationTracking.CountAsync(t => t.TutorId == tutor.TutorId
            && t.IsActive && t.Category == Rules.TutorCategory && t.MakeupScheduleDetailsId == null && t.DeductionInvoiceId == null);

        var pending = await (from tracked in _dbContext.TutorCancellationTracking.AsNoTracking()
                             join detail in _dbContext.ScheduleDetails.AsNoTracking() on tracked.ScheduleDetailsId equals detail.ScheduleDetailsId
                             join request in _dbContext.ScheduleChangeRequest.AsNoTracking() on tracked.MakeupRequestId equals request.Id into requests
                             from request in requests.DefaultIfEmpty()
                             where tracked.SalesDetailsId == salesDetailsId && tracked.IsActive
                                 && tracked.MakeupScheduleDetailsId == null && tracked.DeductionInvoiceId == null
                             orderby detail.StartTime
                             select new { tracked, detail.StartTime, detail.EndTime, RequestStatus = (int?)request.Status, request.Summary })
            .ToListAsync();

        return new TutorCancellationSummaryDto
        {
            SalesDetailsId = salesDetailsId,
            Year = classDate.Year,
            Month = classDate.Month,
            WeeklyClasses = usage.WeeklyClasses,
            MonthlyClasses = usage.MonthlyClasses,
            Allowed = usage.Allowed,
            Used = usage.Used,
            Remaining = usage.Remaining,
            CanCancel = usage.CanCancel,
            DeductionPercent = config?.DeductionPercent,
            ConfigError = usage.ConfigError,
            Message = Rules.SummaryMessage(usage, classDate, tutorPending, config?.DeductionPercent ?? 0m),
            PendingMakeups = pending.Select(p => new PendingMakeupDto
            {
                ScheduleDetailsId = p.tracked.ScheduleDetailsId,
                ClassStart = p.StartTime,
                ClassEnd = p.EndTime,
                Category = p.tracked.Category,
                RescheduleBy = Rules.NextMonthStart(p.tracked.ClassDate).AddDays(-1),
                MakeupRequestStatus = p.RequestStatus.HasValue ? ((ClassStatusEditRequestStatus)p.RequestStatus.Value).ToString() : null,
                MakeupRequestSummary = p.Summary,
            }).ToList(),
        };
    }

    // The cancellation a class is tracked under (null when it is not a cancelled class); for the access check.
    public Task<Guid?> GetCancelledClassSalesDetailsIdAsync(Guid scheduleDetailsId) =>
        _dbContext.TutorCancellationTracking.AsNoTracking()
            .Where(t => t.ScheduleDetailsId == scheduleDetailsId && t.IsActive)
            .Select(t => (Guid?)t.SalesDetailsId).FirstOrDefaultAsync();

    public async Task<ScheduleChangeRequestResultDto> CreateMakeupRequestAsync(MakeupRequestDto input, Guid userId, string requesterType)
    {
        ScheduleChangeRequestResultDto Fail(string message) => new() { Succeeded = false, Message = message };

        var tracked = await _dbContext.TutorCancellationTracking.FirstOrDefaultAsync(t => t.ScheduleDetailsId == input.ScheduleDetailsId && t.IsActive);
        if (tracked == null) return Fail("This class is not a cancelled class waiting for a make-up.");
        if (tracked.MakeupScheduleDetailsId != null) return Fail("A make-up class has already been approved for this cancelled class.");
        if (tracked.DeductionInvoiceId != null) return Fail("This cancelled class was not re-scheduled in time and has already been deducted.");
        if (await _dbContext.ScheduleChangeRequest.AnyAsync(r => r.ScheduleDetailsId == input.ScheduleDetailsId
                && r.RequestKind == CancelledClassMakeupKind && r.Status == (int)ClassStatusEditRequestStatus.Pending))
            return new() { Succeeded = false, AlreadyPending = true, Message = "A make-up for this class is already waiting for Operations." };
        if (input.End <= input.Start || input.End.Date != input.Start.Date)
            return Fail("Choose the make-up class's date, start time and end time.");

        var change = new WeeklyDayChangeRequestDto
        {
            SalesDetailsId = tracked.SalesDetailsId,
            FromDate = input.Start.Date,
            Days = new List<int> { (int)input.Start.DayOfWeek },
            StartTime = input.Start.ToString("HH:mm"),
            EndTime = input.End.ToString("HH:mm"),
            Weeks = 1,
        };
        var check = await AddWeeklyDayChangeAsync(change, userId, dryRun: true);
        if (!check.Succeeded) return Fail(check.Message);

        var cancelledStart = await _dbContext.ScheduleDetails.Where(d => d.ScheduleDetailsId == input.ScheduleDetailsId)
            .Select(d => d.StartTime).FirstAsync();
        var entity = new ScheduleChangeRequest
        {
            Id = Guid.NewGuid(),
            SalesDetailsId = tracked.SalesDetailsId,
            RequestedBy = userId,
            RequesterType = requesterType,
            FromDate = change.FromDate,
            Days = string.Join(",", change.Days),
            StartTime = change.StartTime,
            EndTime = change.EndTime,
            Weeks = change.Weeks,
            Summary = $"Make-up for the cancelled class of {cancelledStart:dd-MMM-yyyy hh:mm tt}: " +
                      $"{input.Start:ddd dd-MMM-yyyy hh:mm tt} - {input.End:hh:mm tt}",
            Status = (int)ClassStatusEditRequestStatus.Pending,
            CreatedDate = DateTime.UtcNow,
            RequestKind = CancelledClassMakeupKind,
            ScheduleDetailsId = input.ScheduleDetailsId,
        };
        _dbContext.ScheduleChangeRequest.Add(entity);
        tracked.MakeupRequestId = entity.Id;
        tracked.ModifiedDate = DateHelper.TCTConvertTimeFromUtc(DateTime.UtcNow);
        await _dbContext.SaveChangesAsync();
        return new()
        {
            Succeeded = true,
            Message = "Make-up request sent to Operations. The class is added once they approve it.",
            Request = await GetScheduleChangeRequestAsync(entity.Id),
        };
    }

    // Pay slip generation (GenerateTutorInvoiceAsync, inside its transaction): every tutor cancellation of this tutor that
    // is due (TutorCancellationRules.DueForDeduction) is deducted from the new pay slip. Each row is stamped with the
    // invoice only while it has none, so a retry or a second run can never deduct a class twice. Returns the total.
    // A tutor cancellation not yet deducted, with what the deduction decision needs.
    private sealed record CancellationCandidate(Guid Id, Guid ScheduleDetailsId, Guid ScheduleTutorKey, string Category,
        bool CountsAgainstAllowance, bool IsActive, DateTime ClassDate, DateTime? RescheduledAt, long? DeductionInvoiceId,
        DateTime StartTime, DateTime EndTime, decimal Rate, bool StillCancelled, bool MakeupApprovedWithoutClass, Guid StudentId, Guid SubjectId);

    // tutorKeys: one tutor's Tutor.Id and User.Id (Schedule.TutorId holds either); null for every tutor.
    private Task<List<CancellationCandidate>> LoadCancellationCandidatesAsync(IReadOnlyCollection<Guid>? tutorKeys, DateTime payrollEnd)
    {
        var schedules = _dbContext.Schedule.AsNoTracking();
        if (tutorKeys != null)
        {
            var keys = tutorKeys.ToList();
            schedules = schedules.Where(s => keys.Contains(s.TutorId));
        }
        return (from tracked in _dbContext.TutorCancellationTracking.AsNoTracking()
         join detail in _dbContext.ScheduleDetails.AsNoTracking() on tracked.ScheduleDetailsId equals detail.ScheduleDetailsId
         join schedule in schedules on detail.ScheduleId equals schedule.ScheduleId
         join course in _dbContext.SalesDetails.AsNoTracking() on schedule.SalesDetailsId equals course.Id
         join tutorStatus in _dbContext.Type_Code.AsNoTracking() on detail.TutorScheduleStatus equals tutorStatus.Id into statuses
         from tutorStatus in statuses.DefaultIfEmpty()
         join request in _dbContext.ScheduleChangeRequest.AsNoTracking() on tracked.MakeupRequestId equals request.Id into requests
         from request in requests.DefaultIfEmpty()
         where tracked.Category == Rules.TutorCategory && tracked.CountsAgainstAllowance && tracked.IsActive
             && tracked.DeductionInvoiceId == null && tracked.ClassDate < payrollEnd
         select new CancellationCandidate(tracked.Id, tracked.ScheduleDetailsId, schedule.TutorId, tracked.Category,
             tracked.CountsAgainstAllowance, tracked.IsActive, tracked.ClassDate, tracked.RescheduledAt, tracked.DeductionInvoiceId,
             detail.StartTime, detail.EndTime, schedule.TutorRate ?? course.TutorPayment,
             detail.IsActive && tutorStatus != null && tutorStatus.TypeCodeValue == Rules.CancelledStatusCode,
             request != null && request.Status == (int)ClassStatusEditRequestStatus.Approved && tracked.MakeupScheduleDetailsId == null,
             schedule.StudentId, course.SubjectId)).ToListAsync();
    }

    private static Rules.DeductionDecision Decide(CancellationCandidate c, int year, int month, DateTime today) =>
        Rules.DecideDeduction(c.Category, c.CountsAgainstAllowance, c.IsActive, c.ClassDate, c.RescheduledAt, c.DeductionInvoiceId,
            year, month, today, c.StillCancelled, c.MakeupApprovedWithoutClass);

    /// <summary>
    /// Payroll review: tutor cancellations of the given month that are not deducted because it is not certain whether they
    /// were re-scheduled (DeductionDecision.Uncertain), for Operations to investigate. tutorKeys: one tutor, or null for all.
    /// </summary>
    public async Task<List<CancellationReviewItemDto>> GetCancellationReviewAsync(int year, int month, IReadOnlyCollection<Guid>? tutorKeys = null)
    {
        var monthStart = new DateTime(year, month, 1);
        var today = DateHelper.TCTConvertTimeFromUtc(DateTime.UtcNow);
        var uncertain = (await LoadCancellationCandidatesAsync(tutorKeys, monthStart.AddMonths(1)))
            .Where(c => c.ClassDate >= monthStart && Decide(c, year, month, today) == Rules.DeductionDecision.Uncertain).ToList();
        if (uncertain.Count == 0) return new();

        var keys = uncertain.Select(c => c.ScheduleTutorKey).Distinct().ToList();
        var tutors = await (from t in _dbContext.Tutor.AsNoTracking() join u in _dbContext.User.AsNoTracking() on t.UserId equals u.Id
                            where keys.Contains(t.Id) || keys.Contains(t.UserId)
                            select new { t.Id, t.UserId, u.FullName, u.UserCode }).ToListAsync();
        var studentIds = uncertain.Select(c => c.StudentId).Distinct().ToList();
        var students = await (from s in _dbContext.Student.AsNoTracking() join u in _dbContext.User.AsNoTracking() on s.UserId equals u.Id
                              where studentIds.Contains(s.Id) select new { s.Id, u.FullName }).ToListAsync();
        var subjectIds = uncertain.Select(c => c.SubjectId).Distinct().ToList();
        var subjects = await _dbContext.Type_Code.AsNoTracking().Where(c => subjectIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id, c => c.TypeCodeName);

        return uncertain.OrderBy(c => c.StartTime).Select(c =>
        {
            var tutor = tutors.FirstOrDefault(t => t.Id == c.ScheduleTutorKey || t.UserId == c.ScheduleTutorKey);
            return new CancellationReviewItemDto
            {
                TrackingId = c.Id,
                ScheduleDetailsId = c.ScheduleDetailsId,
                TutorUserId = tutor?.UserId ?? c.ScheduleTutorKey,
                TutorName = tutor == null ? "" : $"{tutor.FullName} ({tutor.UserCode})",
                StudentName = students.FirstOrDefault(s => s.Id == c.StudentId)?.FullName ?? "",
                Subject = subjects.TryGetValue(c.SubjectId, out var subject) ? subject ?? "" : "",
                ClassStart = c.StartTime,
                Reason = c.MakeupApprovedWithoutClass
                    ? "A make-up was approved, but its class could not be identified."
                    : "The class was changed or removed after it was cancelled, and no make-up class is linked.",
            };
        }).ToList();
    }

    // Tutor Payroll list: each tutor's cancellations to review for the month (rows' TutorId is the tutor's User.Id).
    // Missing tracking table (TutorCancellationRules.sql not run yet): the list is shown without them.
    private async Task AddCancellationReviewAsync(List<PayrollRequestDto> payroll, int year, int month)
    {
        List<CancellationReviewItemDto> review;
        try { review = await GetCancellationReviewAsync(year, month); }
        catch (Microsoft.Data.SqlClient.SqlException) { return; }
        foreach (var row in payroll)
        {
            var items = review.Where(r => r.TutorUserId == row.TutorId).ToList();
            row.CancellationsToReview = items.Count;
            row.CancellationReviewNotes = items.Select(r => $"{r.ClassStart:dd-MMM-yyyy hh:mm tt} with {r.StudentName}" +
                (string.IsNullOrEmpty(r.Subject) ? "" : $" ({r.Subject})") + $": {r.Reason}").ToList();
        }
    }

    // Total deducted, and the cancellations left undeducted because it is not certain whether they were re-scheduled.
    private async Task<(decimal Total, int Uncertain)> ApplyCancellationDeductionsAsync(Tutor tutor, long invoiceId, int year, int month)
    {
        var (config, _) = await TutorCancellationTracker.LoadConfigAsync(_dbContext);
        // Invalid configuration: no deduction rather than a wrong one (tutor cancellations are blocked meanwhile).
        if (config == null) return (0m, 0);

        var payrollEnd = new DateTime(year, month, 1).AddMonths(1);
        var candidates = await LoadCancellationCandidatesAsync(new[] { tutor.Id, tutor.UserId }, payrollEnd);

        var now = DateHelper.TCTConvertTimeFromUtc(DateTime.UtcNow);
        var total = 0m;
        var decisions = candidates.Select(c => (Row: c, Decision: Decide(c, year, month, now))).ToList();
        var uncertain = decisions.Count(d => d.Decision == Rules.DeductionDecision.Uncertain);
        foreach (var due in decisions.Where(d => d.Decision == Rules.DeductionDecision.Deduct).Select(d => d.Row))
        {
            var amount = Rules.DeductionAmount(due.StartTime, due.EndTime, due.Rate, config.DeductionPercent);
            var stamped = await _dbContext.TutorCancellationTracking
                .Where(t => t.Id == due.Id && t.DeductionInvoiceId == null)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(t => t.DeductionInvoiceId, (long?)invoiceId)
                    .SetProperty(t => t.DeductionAmount, (decimal?)amount)
                    .SetProperty(t => t.DeductedAt, (DateTime?)now)
                    .SetProperty(t => t.ModifiedDate, (DateTime?)now));
            if (stamped == 1) total += amount;
        }

        if (total > 0)
            await _dbContext.TutorInvoice.Where(i => i.Id == invoiceId)
                .ExecuteUpdateAsync(s => s.SetProperty(i => i.TutorTotalPayment,
                    i => i.TutorTotalPayment - total < 0 ? 0 : i.TutorTotalPayment - total));
        return (total, uncertain);
    }

    public Task<decimal> GetInvoiceCancellationDeductionsAsync(long invoiceId) =>
        _dbContext.TutorCancellationTracking.AsNoTracking()
            .Where(t => t.DeductionInvoiceId == invoiceId)
            .SumAsync(t => t.DeductionAmount ?? 0m);

    // Deductions on this pay slip whose tutor has not been notified yet.
    public async Task<List<CancellationDeductionNoticeDto>> GetUnnotifiedCancellationDeductionsAsync(long invoiceId)
    {
        var (config, _) = await TutorCancellationTracker.LoadConfigAsync(_dbContext);
        var percent = config?.DeductionPercent ?? 0m;
        return await (from tracked in _dbContext.TutorCancellationTracking.AsNoTracking()
                      join detail in _dbContext.ScheduleDetails.AsNoTracking() on tracked.ScheduleDetailsId equals detail.ScheduleDetailsId
                      join schedule in _dbContext.Schedule.AsNoTracking() on detail.ScheduleId equals schedule.ScheduleId
                      join course in _dbContext.SalesDetails.AsNoTracking() on schedule.SalesDetailsId equals course.Id
                      join tutor in _dbContext.Tutor.AsNoTracking() on schedule.TutorId equals tutor.Id into tutors
                      from tutor in tutors.DefaultIfEmpty()
                      join student in _dbContext.Student.AsNoTracking() on schedule.StudentId equals student.Id into students
                      from student in students.DefaultIfEmpty()
                      join studentUser in _dbContext.User.AsNoTracking() on student.UserId equals studentUser.Id into studentUsers
                      from studentUser in studentUsers.DefaultIfEmpty()
                      join subject in _dbContext.Type_Code.AsNoTracking() on course.SubjectId equals subject.Id into subjects
                      from subject in subjects.DefaultIfEmpty()
                      join invoice in _dbContext.TutorInvoice.AsNoTracking() on tracked.DeductionInvoiceId equals invoice.Id
                      where tracked.DeductionInvoiceId == invoiceId && tracked.TutorNotifiedAt == null
                      select new CancellationDeductionNoticeDto
                      {
                          TrackingId = tracked.Id,
                          ScheduleDetailsId = tracked.ScheduleDetailsId,
                          SalesDetailsId = tracked.SalesDetailsId,
                          // Schedule.TutorId holds the Tutor.Id, or the tutor's User.Id on older rows.
                          TutorUserId = tutor != null ? tutor.UserId : schedule.TutorId,
                          StudentName = studentUser != null ? studentUser.FullName : null,
                          Subject = subject != null ? subject.TypeCodeName : null,
                          ClassStart = detail.StartTime,
                          Amount = tracked.DeductionAmount ?? 0m,
                          Percent = percent,
                          InvoiceNumber = invoice.InvoiceNumber,
                      }).ToListAsync();
    }

    // Claims the notification of one deduction (only one caller wins); released again if sending fails.
    public async Task<bool> ClaimCancellationDeductionNoticeAsync(Guid trackingId)
    {
        DateTime? now = DateHelper.TCTConvertTimeFromUtc(DateTime.UtcNow);
        return await _dbContext.TutorCancellationTracking.Where(t => t.Id == trackingId && t.TutorNotifiedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.TutorNotifiedAt, now)) == 1;
    }

    public Task ReleaseCancellationDeductionNoticeAsync(Guid trackingId) =>
        _dbContext.TutorCancellationTracking.Where(t => t.Id == trackingId)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.TutorNotifiedAt, (DateTime?)null));

    private HashSet<Guid> TrackedClassIds() =>
        _dbContext.ChangeTracker.Entries<ScheduleDetails>().Select(e => e.Entity.ScheduleDetailsId).ToHashSet();

    // Approved make-up (DecideScheduleChangeRequestAsync, after the class was added): the class this approval added is
    // the one new ScheduleDetails on the context. Linked only when exactly one was added; otherwise the cancellation
    // stays unlinked and, as an approved make-up without a class, is never deducted (DueForDeduction). Saved by the caller.
    private async Task LinkMakeupAsync(ScheduleChangeRequest request, HashSet<Guid> classesBefore)
    {
        if (request.ScheduleDetailsId == null || !TimeSpan.TryParse(request.StartTime, out var startTime)) return;
        // Newly tracked classes at the approved slot. (AddWeeklyDayChangeAsync also loads one existing class as a sample;
        // it cannot be at this slot, which its clash check has just found free.)
        var start = request.FromDate.Date + startTime;
        var added = _dbContext.ChangeTracker.Entries<ScheduleDetails>().Select(e => e.Entity)
            .Where(d => !classesBefore.Contains(d.ScheduleDetailsId) && d.StartTime == start).ToList();
        if (added.Count != 1) return;
        await TutorCancellationTracker.LinkMakeupAsync(_dbContext, request.ScheduleDetailsId.Value, added[0].ScheduleDetailsId,
            request.RequesterType, request.Id, DateHelper.TCTConvertTimeFromUtc(DateTime.UtcNow));
    }

    // Reschedule Class flow (ScheduleNewEvent with RescheduledFromScheduleDetailsId): the new class re-schedules that
    // cancelled class. Who re-scheduled: the course's tutor or student, otherwise Operations / staff.
    public async Task<bool> LinkRescheduledClassAsync(Guid cancelledScheduleDetailsId, Guid newScheduleDetailsId, Guid actorUserId)
    {
        var course = await (from detail in _dbContext.ScheduleDetails.AsNoTracking()
                            join schedule in _dbContext.Schedule.AsNoTracking() on detail.ScheduleId equals schedule.ScheduleId
                            where detail.ScheduleDetailsId == cancelledScheduleDetailsId
                            select new { schedule.TutorId, schedule.StudentId }).FirstOrDefaultAsync();
        if (course == null) return false;
        var byTutor = await _dbContext.Tutor.AsNoTracking().AnyAsync(t => (t.Id == course.TutorId || t.UserId == course.TutorId) && t.UserId == actorUserId);
        var byStudent = !byTutor && await _dbContext.Student.AsNoTracking().AnyAsync(s => s.Id == course.StudentId && s.UserId == actorUserId);
        var by = byTutor ? Rules.TutorCategory : byStudent ? Rules.StudentCategory : "operations";
        var linked = await TutorCancellationTracker.LinkMakeupAsync(_dbContext, cancelledScheduleDetailsId, newScheduleDetailsId, by, null,
            DateHelper.TCTConvertTimeFromUtc(DateTime.UtcNow));
        if (linked) await _dbContext.SaveChangesAsync();
        return linked;
    }
}
