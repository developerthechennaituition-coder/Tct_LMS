using System.Net;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Services;
using TCT.LMS.Data.Common;
using TCT.LMS.Domain;
using TCT.LMS.Domain.Entities;

namespace TCT.LMS.Infrastructure.Repositories;

/// <summary>Data access for Tutor Change / Student Change requests and their reassignment.</summary>
public sealed class AssignmentChangeRequestRepository : IAssignmentChangeRequestRepository
{
    // Enrolment statuses of a dropped course (no change request is offered for it):
    // 20005 / 20026 / 20031 / 20032 (same "Dropped" group the Operations reports use).
    private static readonly int[] DroppedStatusCodes = { 20005, 20026, 20031, 20032 };

    private readonly ApplicationDbContext _dbContext;

    public AssignmentChangeRequestRepository(ApplicationDbContext dbContext) => _dbContext = dbContext;

    // ─── Permissions ──────────────────────────────────────────────────────────────

    public Task<bool> HasMenuPermissionAsync(IReadOnlyCollection<string> roles, string link, CancellationToken token)
    {
        var roleNames = roles.Where(r => !string.IsNullOrWhiteSpace(r)).Select(r => r.Trim()).ToList();
        return (from p in _dbContext.RoleMenuPermission.AsNoTracking()
                join r in _dbContext.Roles.AsNoTracking() on (int?)p.RoleId equals r.Id
                join m in _dbContext.Menu.AsNoTracking() on p.MenuId equals m.Id
                where roleNames.Contains(r.RoleName!) && p.IsActive && m.IsActive
                    && (p.View || p.Add || p.Edit || p.Delete)
                    && m.Link == link
                select p.Id).AnyAsync(token);
    }

    // ─── Courses offered for a request ────────────────────────────────────────────

    private sealed class CourseRow
    {
        public Guid SalesDetailsId { get; set; }
        public Guid SalesId { get; set; }
        public Guid StudentId { get; set; }
        public Guid? StudentUserId { get; set; }
        public Guid TutorKey { get; set; }
        public Guid SubjectId { get; set; }
        public Guid Status { get; set; }
        public Guid? BoardId { get; set; }
        public Guid? GradeId { get; set; }
        public DateTime CreatedDate { get; set; }
    }

    /// <summary>Active, not dropped courses that have a tutor.</summary>
    private IQueryable<CourseRow> ActiveCourses() =>
        from sd in _dbContext.SalesDetails.AsNoTracking()
        join sa in _dbContext.Sales.AsNoTracking() on sd.SalesId equals sa.Id
        join st in _dbContext.Student.AsNoTracking() on sa.StudentId equals (Guid?)st.Id
        where sd.IsActive && sa.IsActive && sd.TutorId != null && sd.TutorId != Guid.Empty
            && !_dbContext.Type_Code.Any(c => c.Id == sd.Status && DroppedStatusCodes.Contains(c.TypeCodeValue))
        select new CourseRow
        {
            SalesDetailsId = sd.Id,
            SalesId = sa.Id,
            StudentId = st.Id,
            StudentUserId = st.UserId,
            TutorKey = sd.TutorId!.Value,
            SubjectId = sd.SubjectId,
            Status = sd.Status,
            BoardId = sa.BoardId,
            GradeId = sa.GradeId,
            CreatedDate = sd.CreatedDate,
        };

    public async Task<IReadOnlyList<ChangeAssignmentDto>> GetStudentAssignmentsAsync(Guid studentUserId, CancellationToken token)
    {
        var rows = await ActiveCourses().Where(c => c.StudentUserId == studentUserId).ToListAsync(token);
        return await ToAssignmentsAsync(rows, AssignmentChangeRequestType.TutorChange, token);
    }

    public async Task<IReadOnlyList<ChangeAssignmentDto>> GetTutorAssignmentsAsync(Guid tutorUserId, CancellationToken token)
    {
        var tutorIds = await _dbContext.Tutor.AsNoTracking().Where(t => t.UserId == tutorUserId).Select(t => t.Id).ToListAsync(token);
        if (tutorIds.Count == 0) return Array.Empty<ChangeAssignmentDto>();
        // SalesDetails.TutorId holds the Tutor.Id (older rows may hold the tutor's User.Id).
        var rows = await ActiveCourses()
            .Where(c => tutorIds.Contains(c.TutorKey) || c.TutorKey == tutorUserId)
            .ToListAsync(token);
        return await ToAssignmentsAsync(rows, AssignmentChangeRequestType.StudentChange, token);
    }

    private async Task<IReadOnlyList<ChangeAssignmentDto>> ToAssignmentsAsync(List<CourseRow> rows, string requestType, CancellationToken token)
    {
        if (rows.Count == 0) return Array.Empty<ChangeAssignmentDto>();

        var tutorKeys = rows.Select(r => r.TutorKey).Distinct().ToList();
        var tutors = await (
            from t in _dbContext.Tutor.AsNoTracking()
            join u in _dbContext.User.AsNoTracking() on t.UserId equals u.Id
            where tutorKeys.Contains(t.Id) || tutorKeys.Contains(t.UserId)
            select new { t.Id, t.UserId, u.FullName, u.FirstName, u.LastName })
            .ToListAsync(token);

        var studentUserIds = rows.Where(r => r.StudentUserId.HasValue).Select(r => r.StudentUserId!.Value).Distinct().ToList();
        var studentNames = await _dbContext.User.AsNoTracking()
            .Where(u => studentUserIds.Contains(u.Id))
            .Select(u => new { u.Id, u.FullName, u.FirstName, u.LastName })
            .ToDictionaryAsync(u => u.Id, u => Name(u.FullName, u.FirstName, u.LastName), token);

        var codeNames = await CodeNamesAsync(rows.SelectMany(r => new[] { (Guid?)r.SubjectId, r.Status, r.BoardId, r.GradeId }), token);

        var courseIds = rows.Select(r => r.SalesDetailsId).ToList();
        var pending = await _dbContext.AssignmentChangeRequest.AsNoTracking()
            .Where(x => courseIds.Contains(x.SalesDetailsId) && x.IsActive
                && x.RequestType == requestType && x.Status == AssignmentChangeRequestStatus.Pending)
            .Select(x => new { x.SalesDetailsId, x.RequestNo })
            .ToListAsync(token);

        var result = new List<ChangeAssignmentDto>();
        foreach (var row in rows)
        {
            var tutor = tutors.FirstOrDefault(t => t.Id == row.TutorKey) ?? tutors.FirstOrDefault(t => t.UserId == row.TutorKey);
            if (tutor == null) continue; // the course's tutor no longer resolves to a tutor record
            result.Add(new ChangeAssignmentDto
            {
                SalesDetailsId = row.SalesDetailsId,
                SalesId = row.SalesId,
                StudentId = row.StudentId,
                StudentName = row.StudentUserId.HasValue && studentNames.TryGetValue(row.StudentUserId.Value, out var sn) ? sn : null,
                TutorId = tutor.Id,
                TutorName = Name(tutor.FullName, tutor.FirstName, tutor.LastName),
                SubjectId = row.SubjectId,
                SubjectName = codeNames.GetValueOrDefault(row.SubjectId),
                BoardName = row.BoardId.HasValue ? codeNames.GetValueOrDefault(row.BoardId.Value) : null,
                GradeName = row.GradeId.HasValue ? codeNames.GetValueOrDefault(row.GradeId.Value) : null,
                CourseStatusName = codeNames.GetValueOrDefault(row.Status),
                EnrolledDate = row.CreatedDate,
                PendingRequestNo = pending.FirstOrDefault(p => p.SalesDetailsId == row.SalesDetailsId)?.RequestNo,
            });
        }

        return result.OrderBy(r => r.SubjectName).ThenBy(r => r.StudentName).ThenBy(r => r.TutorName).ToList();
    }

    // ─── Requests ─────────────────────────────────────────────────────────────────

    public async Task<(bool Created, int RequestNo)> CreateRequestAsync(AssignmentChangeRequest request, CancellationToken token)
    {
        _dbContext.AssignmentChangeRequest.Add(request);
        try
        {
            await _dbContext.SaveChangesAsync(token);
            return (true, request.RequestNo);
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException sql && (sql.Number == 2601 || sql.Number == 2627))
        {
            // UX_AssignmentChangeRequest_OnePending: an open request of this type already exists.
            _dbContext.Entry(request).State = EntityState.Detached;
            return (false, 0);
        }
    }

    private sealed class RequestRow
    {
        public AssignmentChangeRequest Request { get; set; } = null!;
        public Guid? CourseTutorKey { get; set; }
        public Guid SubjectId { get; set; }
        public Guid? BoardId { get; set; }
        public Guid? GradeId { get; set; }
        public Guid? OwnerUserId { get; set; }
    }

    private IQueryable<RequestRow> RequestRows() =>
        from x in _dbContext.AssignmentChangeRequest.AsNoTracking()
        join sd in _dbContext.SalesDetails.AsNoTracking() on x.SalesDetailsId equals sd.Id
        join sa in _dbContext.Sales.AsNoTracking() on sd.SalesId equals sa.Id
        where x.IsActive
        select new RequestRow
        {
            Request = x,
            CourseTutorKey = sd.TutorId,
            SubjectId = sd.SubjectId,
            BoardId = sa.BoardId,
            GradeId = sa.GradeId,
            OwnerUserId = sa.Ownership,
        };

    public async Task<IReadOnlyList<ChangeRequestDto>> GetRequestsAsync(string requestType, Guid? ownerUserId, CancellationToken token)
    {
        var rows = await RequestRows()
            .Where(r => r.Request.RequestType == requestType && (ownerUserId == null || r.OwnerUserId == ownerUserId))
            .OrderByDescending(r => r.Request.CreatedDate)
            .ToListAsync(token);
        return await ToRequestsAsync(rows, token);
    }

    public async Task<ChangeRequestDto?> GetRequestAsync(Guid requestId, CancellationToken token)
    {
        var rows = await RequestRows().Where(r => r.Request.Id == requestId).ToListAsync(token);
        return (await ToRequestsAsync(rows, token)).FirstOrDefault();
    }

    private async Task<IReadOnlyList<ChangeRequestDto>> ToRequestsAsync(List<RequestRow> rows, CancellationToken token)
    {
        if (rows.Count == 0) return Array.Empty<ChangeRequestDto>();

        var tutorIds = rows.SelectMany(r => new[] { (Guid?)r.Request.CurrentTutorId, r.Request.NewTutorId })
            .Where(id => id.HasValue).Select(id => id!.Value).Distinct().ToList();
        var tutors = await (
            from t in _dbContext.Tutor.AsNoTracking()
            join u in _dbContext.User.AsNoTracking() on t.UserId equals u.Id
            where tutorIds.Contains(t.Id)
            select new { t.Id, t.UserId, u.FullName, u.FirstName, u.LastName })
            .ToDictionaryAsync(t => t.Id, token);

        var studentIds = rows.Select(r => r.Request.StudentId).Distinct().ToList();
        var students = await (
            from st in _dbContext.Student.AsNoTracking()
            join u in _dbContext.User.AsNoTracking() on st.UserId equals (Guid?)u.Id
            where studentIds.Contains(st.Id)
            select new { st.Id, u.FullName, u.FirstName, u.LastName })
            .ToDictionaryAsync(s => s.Id, s => Name(s.FullName, s.FirstName, s.LastName), token);

        var userIds = rows.SelectMany(r => new[] { (Guid?)r.Request.CreatedBy, r.Request.DecidedBy })
            .Where(id => id.HasValue).Select(id => id!.Value).Distinct().ToList();
        var users = await _dbContext.User.AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .Select(u => new { u.Id, u.FullName, u.FirstName, u.LastName })
            .ToDictionaryAsync(u => u.Id, u => Name(u.FullName, u.FirstName, u.LastName), token);

        var codeNames = await CodeNamesAsync(rows.SelectMany(r => new[] { (Guid?)r.SubjectId, r.BoardId, r.GradeId }), token);

        return rows.Select(r =>
        {
            var x = r.Request;
            tutors.TryGetValue(x.CurrentTutorId, out var current);
            var newTutor = x.NewTutorId.HasValue && tutors.TryGetValue(x.NewTutorId.Value, out var nt) ? nt : null;
            return new ChangeRequestDto
            {
                Id = x.Id,
                RequestNo = x.RequestNo,
                RequestType = x.RequestType,
                SalesDetailsId = x.SalesDetailsId,
                StudentId = x.StudentId,
                StudentName = students.GetValueOrDefault(x.StudentId),
                CurrentTutorId = x.CurrentTutorId,
                CurrentTutorName = current == null ? null : Name(current.FullName, current.FirstName, current.LastName),
                SubjectName = codeNames.GetValueOrDefault(r.SubjectId),
                BoardName = r.BoardId.HasValue ? codeNames.GetValueOrDefault(r.BoardId.Value) : null,
                GradeName = r.GradeId.HasValue ? codeNames.GetValueOrDefault(r.GradeId.Value) : null,
                Reason = x.Reason,
                Description = x.Description,
                Status = x.Status,
                CreatedDate = x.CreatedDate,
                RequestedByName = users.GetValueOrDefault(x.CreatedBy),
                NewTutorId = x.NewTutorId,
                NewTutorName = newTutor == null ? null : Name(newTutor.FullName, newTutor.FirstName, newTutor.LastName),
                DecidedByName = x.DecidedBy.HasValue ? users.GetValueOrDefault(x.DecidedBy.Value) : null,
                DecidedDate = x.DecidedDate,
                DecisionNote = x.DecisionNote,
                MovedSessionCount = x.MovedSessionCount,
                OwnerUserId = r.OwnerUserId,
                AssignmentUnchanged = r.CourseTutorKey.HasValue && current != null
                    && (r.CourseTutorKey == current.Id || r.CourseTutorKey == current.UserId),
            };
        }).ToList();
    }

    // ─── Review ───────────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<ReplacementTutorDto>> GetReplacementTutorsAsync(Guid salesDetailsId, Guid excludedTutorId, CancellationToken token)
    {
        var course = await (
            from sd in _dbContext.SalesDetails.AsNoTracking()
            join sa in _dbContext.Sales.AsNoTracking() on sd.SalesId equals sa.Id
            where sd.Id == salesDetailsId
            select new { sd.SubjectId, sa.BoardId, sa.GradeId })
            .FirstOrDefaultAsync(token);
        if (course == null || course.BoardId == null || course.GradeId == null) return Array.Empty<ReplacementTutorDto>();

        var rows = await (
            from td in _dbContext.TutorDetails.AsNoTracking()
            join t in _dbContext.Tutor.AsNoTracking() on td.TutorId equals t.Id
            join u in _dbContext.User.AsNoTracking() on t.UserId equals u.Id
            where td.IsActive && t.IsActive && u.IsActive && t.Id != excludedTutorId
                && td.SubjectId == course.SubjectId && td.BoardId == course.BoardId && td.GradeId == course.GradeId
            select new { t.Id, t.UserId, u.FullName, u.FirstName, u.LastName, td.TutorPayment })
            .ToListAsync(token);

        return rows
            .GroupBy(r => r.Id)
            .Select(g => new ReplacementTutorDto
            {
                TutorId = g.Key,
                UserId = g.First().UserId,
                Name = Name(g.First().FullName, g.First().FirstName, g.First().LastName),
                Rate = g.Max(r => r.TutorPayment),
            })
            .OrderBy(t => t.Name)
            .ToList();
    }

    public async Task<IReadOnlyList<ChangeRequestSessionDto>> GetFutureSessionsAsync(Guid salesDetailsId, Guid tutorId, DateTime after, CancellationToken token)
    {
        var tutorUserId = await _dbContext.Tutor.AsNoTracking().Where(t => t.Id == tutorId).Select(t => t.UserId).FirstOrDefaultAsync(token);
        var sessions =
            from s in _dbContext.Schedule.AsNoTracking()
            join d in _dbContext.ScheduleDetails.AsNoTracking() on s.ScheduleId equals d.ScheduleId
            where s.SalesDetailsId == salesDetailsId && s.IsActive && d.IsActive
                && (s.TutorId == tutorId || s.TutorId == tutorUserId)
                && d.StartTime > after
            select d;
        var isMovable = await MovableRuleAsync(sessions.Select(d => d.ScheduleDetailsId), token);
        // Same rule as ApproveAsync, so the classes checked for clashes are exactly the classes that move.
        return (await sessions.OrderBy(d => d.StartTime).ToListAsync(token))
            .Where(d => isMovable(d, after))
            .Select(d => new ChangeRequestSessionDto { ScheduleDetailsId = d.ScheduleDetailsId, StartTime = d.StartTime, EndTime = d.EndTime })
            .ToList();
    }

    // TutorReassignmentRules.IsMovable with its lookups loaded: the placeholder (not yet held) session
    // statuses and which of the given sessions are on a pay slip (any TutorInvoiceDetails row, active or not).
    private async Task<Func<ScheduleDetails, DateTime, bool>> MovableRuleAsync(IQueryable<Guid> sessionIds, CancellationToken token)
    {
        var placeholderStatusIds = (await _dbContext.Type_Code.AsNoTracking()
            .Where(c => TutorReassignmentRules.PlaceholderStatusCodes.Contains(c.TypeCodeValue))
            .Select(c => c.Id).ToListAsync(token)).ToHashSet();
        var invoicedSessionIds = (await _dbContext.TutorInvoiceDetails.AsNoTracking()
            .Where(x => x.ScheduleDetailsId != null && sessionIds.Contains(x.ScheduleDetailsId.Value))
            .Select(x => x.ScheduleDetailsId!.Value).Distinct().ToListAsync(token)).ToHashSet();
        return (session, after) => TutorReassignmentRules.IsMovable(session, after, placeholderStatusIds, invoicedSessionIds);
    }

    // ─── Decisions ────────────────────────────────────────────────────────────────

    public async Task<ChangeRequestApproveOutcome> ApproveAsync(Guid requestId, Guid newTutorId, Guid deciderUserId, string? note,
        DateTime after, CancellationToken token)
    {
        var now = DateTime.UtcNow;
        await using var transaction = await _dbContext.Database.BeginTransactionAsync(token);

        // Lock the request and the course until commit, so two decisions cannot run at once.
        await _dbContext.Database.ExecuteSqlInterpolatedAsync(
            $"SELECT 1 FROM dbo.AssignmentChangeRequest WITH (UPDLOCK, ROWLOCK) WHERE Id = {requestId}", token);
        var request = await _dbContext.AssignmentChangeRequest.FirstOrDefaultAsync(x => x.Id == requestId && x.IsActive, token);
        if (request == null) return ChangeRequestApproveOutcome.Fail(404, "The request was not found.");
        if (request.Status != AssignmentChangeRequestStatus.Pending)
            return ChangeRequestApproveOutcome.Fail(409, "This request has already been decided.");

        await _dbContext.Database.ExecuteSqlInterpolatedAsync(
            $"SELECT 1 FROM dbo.SalesDetails WITH (UPDLOCK, ROWLOCK) WHERE Id = {request.SalesDetailsId}", token);
        var course = await _dbContext.SalesDetails.FirstOrDefaultAsync(x => x.Id == request.SalesDetailsId && x.IsActive, token);
        var oldTutor = await _dbContext.Tutor.AsNoTracking().FirstOrDefaultAsync(t => t.Id == request.CurrentTutorId, token);
        if (course == null || oldTutor == null)
            return ChangeRequestApproveOutcome.Fail(409, "The course is no longer active. Reject this request instead.");
        if (course.TutorId != oldTutor.Id && course.TutorId != oldTutor.UserId)
            return ChangeRequestApproveOutcome.Fail(409, "The course's tutor has changed since this request was raised. Reject this request instead.");
        if (newTutorId == oldTutor.Id)
            return ChangeRequestApproveOutcome.Fail(400, "Choose a tutor other than the current tutor.");

        var sales = await _dbContext.Sales.AsNoTracking().FirstAsync(s => s.Id == course.SalesId, token);
        var newTutor = await (
            from t in _dbContext.Tutor.AsNoTracking()
            join u in _dbContext.User.AsNoTracking() on t.UserId equals u.Id
            where t.Id == newTutorId && t.IsActive && u.IsActive
            select t).FirstOrDefaultAsync(token);
        if (newTutor == null) return ChangeRequestApproveOutcome.Fail(400, "The selected tutor is not available.");

        var hasSkill = await _dbContext.TutorDetails.AnyAsync(td => td.TutorId == newTutor.Id && td.IsActive
            && td.SubjectId == course.SubjectId && td.BoardId == sales.BoardId && td.GradeId == sales.GradeId, token);
        if (!hasSkill)
            return ChangeRequestApproveOutcome.Fail(400, "The selected tutor does not teach this board, grade and subject.");
        var rate = await _dbContext.TutorDetails
            .Where(td => td.TutorId == newTutor.Id && td.IsActive
                && td.SubjectId == course.SubjectId && td.BoardId == sales.BoardId && td.GradeId == sales.GradeId)
            .MaxAsync(td => td.TutorPayment, token);
        if (rate == null || rate <= 0)
            return ChangeRequestApproveOutcome.Fail(400, "The selected tutor has no payment rate configured for this board, grade and subject. Set it in the tutor's skill sets first.");

        // Upcoming, unmarked, unpaid classes move to the new tutor; past classes and any class already marked
        // (attendance / Operations) or on a pay slip stay with the original tutor (TutorReassignmentRules.IsMovable).
        // Each schedule records the rate that pays it, so the original tutor's classes keep the original rate.
        var oldTutorKeys = new[] { oldTutor.Id, oldTutor.UserId };
        var schedules = await _dbContext.Schedule
            .Where(s => s.SalesDetailsId == course.Id && s.IsActive && oldTutorKeys.Contains(s.TutorId))
            .ToListAsync(token);
        var scheduleIds = schedules.Select(s => s.ScheduleId).ToList();
        var isMovable = await MovableRuleAsync(_dbContext.ScheduleDetails
            .Where(d => scheduleIds.Contains(d.ScheduleId) && d.IsActive).Select(d => d.ScheduleDetailsId), token);
        var courseRateBeforeChange = course.TutorPayment;
        var moved = 0;
        foreach (var schedule in schedules)
        {
            var sessions = await _dbContext.ScheduleDetails
                .Where(d => d.ScheduleId == schedule.ScheduleId && d.IsActive)
                .ToListAsync(token);
            var (originalRate, replacementRate) = TutorReassignmentRules.SplitRates(schedule.TutorRate, courseRateBeforeChange, rate.Value);
            var future = sessions.Where(d => isMovable(d, after)).ToList();
            var past = sessions.Where(d => !isMovable(d, after)).ToList();
            if (future.Count == 0)
            {
                // Nothing moves: the schedule stays with the original tutor at the original rate.
                if (schedule.TutorRate != originalRate)
                {
                    schedule.TutorRate = originalRate;
                    schedule.ModifiedBy = deciderUserId;
                    schedule.ModifiedDate = now;
                }
                continue;
            }

            if (past.Count == 0)
            {
                // Nothing has happened yet: the whole schedule changes tutor.
                schedule.TutorId = newTutor.Id;
                schedule.TutorRate = replacementRate;
                schedule.ModifiedBy = deciderUserId;
                schedule.ModifiedDate = now;
                moved += future.Count;
                continue;
            }

            // Split: a copy of the schedule (every setting kept) takes the upcoming sessions.
            var values = _dbContext.Entry(schedule).CurrentValues.Clone();
            values[nameof(Schedule.ScheduleId)] = Guid.NewGuid();
            values[nameof(Schedule.TutorId)] = newTutor.Id;
            values[nameof(Schedule.TutorRate)] = replacementRate;
            values[nameof(Schedule.StartDate)] = future.Min(d => d.StartTime).Date;
            values[nameof(Schedule.CreatedBy)] = deciderUserId;
            values[nameof(Schedule.CreatedDate)] = now;
            values[nameof(Schedule.ModifiedBy)] = null;
            values[nameof(Schedule.ModifiedDate)] = null;
            var copy = (Schedule)values.ToObject();
            if (schedule.TotalClasses.HasValue)
            {
                copy.TotalClasses = future.Count;
                schedule.TotalClasses = Math.Max(0, schedule.TotalClasses.Value - future.Count);
            }
            schedule.EndDate = past.Max(d => d.StartTime).Date;
            schedule.TutorRate = originalRate;
            schedule.ModifiedBy = deciderUserId;
            schedule.ModifiedDate = now;
            _dbContext.Schedule.Add(copy);
            await _dbContext.SaveChangesAsync(token); // the new schedule must exist before its sessions point to it

            foreach (var session in future)
            {
                session.ScheduleId = copy.ScheduleId;
                session.ModifiedBy = deciderUserId;
                session.ModifiedDate = now;
            }
            moved += future.Count;
        }

        // Course: new tutor and its configured rate; the enrolment status is kept.
        course.TutorId = newTutor.Id;
        course.TutorPayment = rate.Value;
        course.ModifiedBy = deciderUserId;
        course.ModifiedDate = now;

        var statusValue = await _dbContext.Type_Code.AsNoTracking()
            .Where(c => c.Id == course.Status).Select(c => (int?)c.TypeCodeValue).FirstOrDefaultAsync(token) ?? 0;
        var previousAllocations = await _dbContext.TutorStudentAllocations
            .Where(a => a.SalesDetailsId == course.Id && a.IsActive)
            .ToListAsync(token);
        var previousStatus = previousAllocations.OrderByDescending(a => a.CreatedDate).Select(a => a.StatusCode).FirstOrDefault() ?? statusValue;
        foreach (var previous in previousAllocations)
        {
            previous.IsActive = false;
            previous.ModifiedBy = deciderUserId;
            previous.ModifiedDate = now;
        }

        var names = await UserNamesAsync(new[] { oldTutor.UserId, newTutor.UserId }, token);
        var oldTutorName = names.GetValueOrDefault(oldTutor.UserId) ?? "the previous tutor";
        var newTutorName = names.GetValueOrDefault(newTutor.UserId) ?? "the new tutor";
        var typeLabel = request.RequestType == AssignmentChangeRequestType.StudentChange ? "Student Change" : "Tutor Change";

        var allocation = new TutorStudentAllocations
        {
            Id = Guid.NewGuid(),
            TutorId = newTutor.Id,
            StudentId = request.StudentId,
            SalesDetailsId = course.Id,
            PaymentAmount = rate.Value,
            StatusCode = statusValue,
            Note = $"{typeLabel} request #{request.RequestNo}",
            IsActive = true,
            CreatedBy = deciderUserId,
            CreatedDate = now,
        };
        _dbContext.TutorStudentAllocations.Add(allocation);
        _dbContext.TutorStudentAllocationHistory.Add(new TutorStudentAllocationHistory
        {
            AllocationId = allocation.Id,
            PreviousStatus = previousStatus,
            NewStatus = statusValue,
            ActionTakenBy = deciderUserId.ToString(),
            ActionEffectiveDate = now,
            Notes = $"{typeLabel} request #{request.RequestNo}: {oldTutorName} → {newTutorName}",
            CreatedBy = deciderUserId,
            CreatedDate = now,
        });

        request.Status = AssignmentChangeRequestStatus.Reassigned;
        request.NewTutorId = newTutor.Id;
        request.DecidedBy = deciderUserId;
        request.DecidedDate = now;
        request.DecisionNote = string.IsNullOrWhiteSpace(note) ? null : note.Trim();
        request.MovedSessionCount = moved;
        request.ModifiedBy = deciderUserId;
        request.ModifiedDate = now;

        // Notifications are part of the same transaction: they exist only if the reassignment commits.
        await AddReassignmentNotificationsAsync(request, course, sales.Id, oldTutor, newTutor, oldTutorName, newTutorName,
            moved, deciderUserId, now, token);

        await _dbContext.SaveChangesAsync(token);
        await transaction.CommitAsync(token);
        return ChangeRequestApproveOutcome.Ok(moved);
    }

    public async Task<bool> RejectAsync(Guid requestId, Guid deciderUserId, string note, CancellationToken token)
    {
        var now = DateTime.UtcNow;
        await using var transaction = await _dbContext.Database.BeginTransactionAsync(token);
        await _dbContext.Database.ExecuteSqlInterpolatedAsync(
            $"SELECT 1 FROM dbo.AssignmentChangeRequest WITH (UPDLOCK, ROWLOCK) WHERE Id = {requestId}", token);
        var request = await _dbContext.AssignmentChangeRequest.FirstOrDefaultAsync(x => x.Id == requestId && x.IsActive, token);
        if (request == null || request.Status != AssignmentChangeRequestStatus.Pending) return false;

        request.Status = AssignmentChangeRequestStatus.Rejected;
        request.DecidedBy = deciderUserId;
        request.DecidedDate = now;
        request.DecisionNote = note.Trim();
        request.ModifiedBy = deciderUserId;
        request.ModifiedDate = now;
        await _dbContext.SaveChangesAsync(token);
        await transaction.CommitAsync(token);
        return true;
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────────

    private async Task AddReassignmentNotificationsAsync(AssignmentChangeRequest request, SalesDetails course, Guid salesId,
        Tutor oldTutor, Tutor newTutor, string oldTutorName, string newTutorName, int moved, Guid deciderUserId, DateTime now,
        CancellationToken token)
    {
        var studentUserId = await _dbContext.Student.AsNoTracking()
            .Where(s => s.Id == request.StudentId).Select(s => s.UserId).FirstOrDefaultAsync(token);
        var studentName = studentUserId.HasValue
            ? (await UserNamesAsync(new[] { studentUserId.Value }, token)).GetValueOrDefault(studentUserId.Value) ?? "the student"
            : "the student";
        var subject = await _dbContext.Type_Code.AsNoTracking()
            .Where(c => c.Id == course.SubjectId).Select(c => c.TypeCodeName).FirstOrDefaultAsync(token) ?? "the subject";

        string E(string value) => WebUtility.HtmlEncode(value);
        var classes = moved == 1 ? "1 upcoming class" : $"{moved} upcoming classes";
        var recipients = new Dictionary<Guid, string>();

        if (studentUserId.HasValue && studentUserId.Value != Guid.Empty)
        {
            recipients[studentUserId.Value] =
                $"Your <b>{E(subject)}</b> tutor has been changed from <b>{E(oldTutorName)}</b> to <b>{E(newTutorName)}</b> " +
                $"(request #{request.RequestNo}). " + (moved > 0 ? $"{classes} will now be taken by {E(newTutorName)}." : "");
        }
        if (oldTutor.UserId != Guid.Empty)
        {
            recipients[oldTutor.UserId] = request.RequestType == AssignmentChangeRequestType.StudentChange
                ? $"Your Student Change request #{request.RequestNo} for <b>{E(studentName)}</b> (<b>{E(subject)}</b>) has been completed. " +
                  "The student has been assigned to another tutor" + (moved > 0 ? $" and {classes} removed from your calendar." : ".")
                : $"<b>{E(studentName)}</b>'s <b>{E(subject)}</b> course has been assigned to another tutor (request #{request.RequestNo})" +
                  (moved > 0 ? $"; {classes} removed from your calendar." : ".");
        }
        if (newTutor.UserId != Guid.Empty)
        {
            recipients[newTutor.UserId] =
                $"You have been assigned <b>{E(studentName)}</b> for <b>{E(subject)}</b> (request #{request.RequestNo})" +
                (moved > 0 ? $"; {classes} added to your calendar." : ".");
        }

        foreach (var (toUserId, message) in recipients)
        {
            var notification = new Notification
            {
                Id = Guid.NewGuid(),
                SalesId = salesId,
                SalesDetailsId = course.Id,
                NotificationType = (int)NotificationType.TutorReassigned,
                Message = message,
                CreatedBy = deciderUserId,
                CreatedDate = now,
                IsActive = true,
            };
            _dbContext.Notification.Add(notification);
            _dbContext.NotificationDetails.Add(new NotificationDetails
            {
                Id = Guid.NewGuid(),
                NotificationId = notification.Id,
                FromUserId = deciderUserId,
                ToUserId = toUserId,
                CreatedBy = deciderUserId,
                CreatedDate = now,
                IsActive = true,
                IsRead = false,
            });
        }
    }

    private async Task<Dictionary<Guid, string>> UserNamesAsync(IEnumerable<Guid> userIds, CancellationToken token)
    {
        var ids = userIds.Distinct().ToList();
        return await _dbContext.User.AsNoTracking()
            .Where(u => ids.Contains(u.Id))
            .Select(u => new { u.Id, u.FullName, u.FirstName, u.LastName })
            .ToDictionaryAsync(u => u.Id, u => Name(u.FullName, u.FirstName, u.LastName), token);
    }

    private async Task<Dictionary<Guid, string>> CodeNamesAsync(IEnumerable<Guid?> ids, CancellationToken token)
    {
        var list = ids.Where(id => id.HasValue && id != Guid.Empty).Select(id => id!.Value).Distinct().ToList();
        return await _dbContext.Type_Code.AsNoTracking()
            .Where(c => list.Contains(c.Id))
            .ToDictionaryAsync(c => c.Id, c => c.TypeCodeName ?? string.Empty, token);
    }

    private static string Name(string? fullName, string? firstName, string? lastName) =>
        !string.IsNullOrWhiteSpace(fullName) ? fullName.Trim() : $"{firstName} {lastName}".Trim();
}
