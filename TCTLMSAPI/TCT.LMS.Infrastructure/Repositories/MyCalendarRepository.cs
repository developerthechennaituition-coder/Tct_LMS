using System.Net;
using Microsoft.EntityFrameworkCore;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Data.Common;
using TCT.LMS.Domain.Entities;
using TCT.LMS.Domain;

namespace TCT.LMS.Infrastructure.Repositories;

/// <summary>Data access for My Calendar (demo classes) and its Tasks tab.</summary>
public sealed class MyCalendarRepository : IMyCalendarRepository
{
    private const string DemoScheduleType = "Demo";
    private const string ClassScheduleType = "Class";
    private readonly ApplicationDbContext _dbContext;

    public MyCalendarRepository(ApplicationDbContext dbContext) => _dbContext = dbContext;

    // ─── Demo calendar ────────────────────────────────────────────────────────────

    /// <summary>
    /// Active demo classes (ScheduleType = "Demo") in the month that the user may see:
    /// • demos the user scheduled (Schedule.CreatedBy), for every eligible role;
    /// • Coordinator: demos of the course enrolments they coordinate (SalesDetails.Coordinator) — the same
    ///   ownership rule the existing coordinator calendar uses;
    /// • Operations / Operations Admin: demos of the students they own (Sales.Ownership) — the existing
    ///   operations calendar rule.
    /// No role is given every user's schedules.
    /// </summary>
    public Task<IReadOnlyList<MyCalendarDemoDto>> GetDemoSchedulesAsync(
        Guid userId, IReadOnlyCollection<string> roles, int month, int year, CancellationToken token) =>
        GetSchedulesAsync(userId, roles, month, year, DemoScheduleType, includeScheduledByUser: true, token);

    /// <summary>
    /// Active regular classes (ScheduleType = "Class") in the month, for Operations / Operations Admin only:
    /// students they own (Sales.Ownership), the existing operations calendar rule. Coordinators and other
    /// roles see none (only the Operations roles are passed on). The tutor is the one on each schedule row.
    /// </summary>
    public Task<IReadOnlyList<MyCalendarDemoDto>> GetClassSchedulesAsync(
        Guid userId, IReadOnlyCollection<string> roles, int month, int year, CancellationToken token) =>
        GetSchedulesAsync(userId,
            roles.Where(r => string.Equals(r?.Trim(), "Operations", StringComparison.OrdinalIgnoreCase)
                          || string.Equals(r?.Trim(), "OperationsAdmin", StringComparison.OrdinalIgnoreCase)).ToList(),
            month, year, ClassScheduleType, includeScheduledByUser: false, token);

    private async Task<IReadOnlyList<MyCalendarDemoDto>> GetSchedulesAsync(Guid userId, IReadOnlyCollection<string> roles,
        int month, int year, string scheduleType, bool includeScheduledByUser, CancellationToken token)
    {
        var roleSet = new HashSet<string>(roles, StringComparer.OrdinalIgnoreCase);
        var isCoordinator = roleSet.Contains("Coordinator");
        var isOperations = roleSet.Contains("Operations") || roleSet.Contains("OperationsAdmin");

        var monthStart = new DateTime(year, month, 1);
        var monthEnd = monthStart.AddMonths(1);

        var rows = await (
            from d in _dbContext.ScheduleDetails.AsNoTracking()
            join s in _dbContext.Schedule.AsNoTracking() on d.ScheduleId equals s.ScheduleId
            where d.IsActive && s.IsActive
                && d.ScheduleType == scheduleType
                && d.StartTime < monthEnd && d.EndTime >= monthStart
                && ((includeScheduledByUser && s.CreatedBy == userId)
                    || (isCoordinator && _dbContext.SalesDetails.Any(sd =>
                            sd.Id == s.SalesDetailsId && sd.Coordinator == userId && sd.IsActive))
                    || (isOperations && _dbContext.Sales.Any(sa =>
                            sa.StudentId == s.StudentId && sa.Ownership == userId && sa.IsActive)))
            orderby d.StartTime
            select new MyCalendarDemoDto
            {
                ScheduleDetailsId = d.ScheduleDetailsId,
                ScheduleId = s.ScheduleId,
                SalesDetailsId = s.SalesDetailsId,
                SalesId = _dbContext.SalesDetails.Where(sd => sd.Id == s.SalesDetailsId).Select(sd => sd.SalesId).FirstOrDefault(),
                EnrollmentStatusId = _dbContext.SalesDetails.Where(sd => sd.Id == s.SalesDetailsId).Select(sd => (Guid?)sd.Status).FirstOrDefault(),
                CoordinatorUserId = _dbContext.SalesDetails.Where(sd => sd.Id == s.SalesDetailsId).Select(sd => sd.Coordinator).FirstOrDefault(),
                StudentId = s.StudentId,
                SubjectId = s.SubjectId,
                Title = s.Title,
                ScheduleType = d.ScheduleType,
                Date = d.Date,
                StartTime = d.StartTime,
                EndTime = d.EndTime,
                MeetingLink = d.MeetingLink,
                TutorScheduleStatus = d.TutorScheduleStatus,
                StudentScheduleStatus = d.StudentScheduleStatus,
                OperationScheduleStatus = d.OperationScheduleStatus,
                // carried through to resolve the tutor name below
                TutorUserId = s.TutorId,
            })
            .ToListAsync(token);

        if (rows.Count == 0) return rows;

        // Names in bulk (no per-row queries).
        var studentIds = rows.Select(r => r.StudentId).Distinct().ToList();
        var students = await (
            from st in _dbContext.Student.AsNoTracking()
            join u in _dbContext.User.AsNoTracking() on st.UserId equals u.Id
            where studentIds.Contains(st.Id)
            select new { st.Id, u.FirstName, u.LastName, UserId = u.Id })
            .ToDictionaryAsync(x => x.Id, token);

        // Schedule.TutorId holds the Tutor.Id; some older rows hold the tutor's User.Id directly.
        var tutorIds = rows.Where(r => r.TutorUserId.HasValue && r.TutorUserId != Guid.Empty)
            .Select(r => r.TutorUserId!.Value).Distinct().ToList();
        var tutorsByTutorId = await (
            from t in _dbContext.Tutor.AsNoTracking()
            join u in _dbContext.User.AsNoTracking() on t.UserId equals u.Id
            where tutorIds.Contains(t.Id)
            select new { t.Id, u.FirstName, u.LastName, UserId = u.Id })
            .ToDictionaryAsync(x => x.Id, token);
        var tutorsByUserId = await _dbContext.User.AsNoTracking()
            .Where(u => tutorIds.Contains(u.Id))
            .Select(u => new { u.Id, u.FirstName, u.LastName })
            .ToDictionaryAsync(x => x.Id, token);

        var codeIds = rows.SelectMany(r => new[] { (Guid?)r.SubjectId, r.OperationScheduleStatus, r.TutorScheduleStatus, r.StudentScheduleStatus, r.EnrollmentStatusId })
            .Where(id => id.HasValue && id != Guid.Empty).Select(id => id!.Value).Distinct().ToList();
        var codes = await _dbContext.Type_Code.AsNoTracking()
            .Where(c => codeIds.Contains(c.Id))
            .Select(c => new { c.Id, c.TypeCodeName, c.TypeCodeValue })
            .ToDictionaryAsync(x => x.Id, token);
        var codeNames = codes.ToDictionary(x => x.Key, x => x.Value.TypeCodeName);

        foreach (var row in rows)
        {
            if (students.TryGetValue(row.StudentId, out var student))
            {
                row.StudentName = $"{student.FirstName} {student.LastName}".Trim();
                row.StudentUserId = student.UserId;
            }

            var tutorKey = row.TutorUserId;
            row.TutorUserId = null;
            row.TutorName = "NA";
            if (tutorKey.HasValue && tutorsByTutorId.TryGetValue(tutorKey.Value, out var tutor))
            {
                row.TutorName = $"{tutor.FirstName} {tutor.LastName}".Trim();
                row.TutorUserId = tutor.UserId;
            }
            else if (tutorKey.HasValue && tutorsByUserId.TryGetValue(tutorKey.Value, out var tutorUser))
            {
                row.TutorName = $"{tutorUser.FirstName} {tutorUser.LastName}".Trim();
                row.TutorUserId = tutorUser.Id;
            }

            row.SubjectName = codeNames.TryGetValue(row.SubjectId, out var subject) ? subject : null;
            var statusId = new[] { row.OperationScheduleStatus, row.TutorScheduleStatus, row.StudentScheduleStatus }
                .FirstOrDefault(id => id.HasValue && id != Guid.Empty);
            if (statusId.HasValue && codeNames.TryGetValue(statusId.Value, out var statusName) && !string.IsNullOrWhiteSpace(statusName))
                row.StatusName = statusName;

            if (row.EnrollmentStatusId.HasValue && codes.TryGetValue(row.EnrollmentStatusId.Value, out var enrollmentStatus))
            {
                row.EnrollmentStatusCode = enrollmentStatus.TypeCodeValue;
                row.EnrollmentStatusName = enrollmentStatus.TypeCodeName;
            }
        }

        return rows;
    }

    // ─── Task recipients ──────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<TaskAssigneeDto>> GetTaskAssigneesAsync(IReadOnlyCollection<string> excludedRoles, CancellationToken token)
    {
        var rows = await (
            from u in _dbContext.User.AsNoTracking()
            join ur in _dbContext.UserRole.AsNoTracking() on u.Id equals ur.UserId
            join r in _dbContext.Roles.AsNoTracking() on (int?)ur.RoleId equals r.Id
            where u.IsActive && ur.IsActive && r.IsActive && !excludedRoles.Contains(r.RoleName!)
            select new { u.Id, u.FirstName, u.LastName, u.FullName, u.UserCode, u.Email, r.RoleName, RoleId = r.Id })
            .ToListAsync(token);

        // One entry per user (a user can hold several roles); role names in role-id order.
        return rows
            .GroupBy(x => x.Id)
            .Select(g =>
            {
                var first = g.First();
                var name = !string.IsNullOrWhiteSpace(first.FullName)
                    ? first.FullName!.Trim()
                    : $"{first.FirstName} {first.LastName}".Trim();
                var roleNames = g.OrderBy(x => x.RoleId).Select(x => x.RoleName ?? string.Empty)
                    .Where(n => n.Length > 0).Distinct().ToList();
                return new TaskAssigneeDto(g.Key, name, first.UserCode, first.Email, roleNames);
            })
            .OrderBy(x => x.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    public Task<bool> IsEligibleAssigneeAsync(Guid userId, IReadOnlyCollection<string> excludedRoles, CancellationToken token) =>
        (from u in _dbContext.User.AsNoTracking()
         join ur in _dbContext.UserRole.AsNoTracking() on u.Id equals ur.UserId
         join r in _dbContext.Roles.AsNoTracking() on (int?)ur.RoleId equals r.Id
         where u.Id == userId && u.IsActive && ur.IsActive && r.IsActive && !excludedRoles.Contains(r.RoleName!)
         select u.Id).AnyAsync(token);

    // ─── Tasks ────────────────────────────────────────────────────────────────────

    private IQueryable<UserTaskDto> TaskQuery() =>
        from t in _dbContext.UserTask.AsNoTracking()
        where t.IsActive
        join toUser in _dbContext.User.AsNoTracking() on t.AssignedToUserId equals toUser.Id
        join byUser in _dbContext.User.AsNoTracking() on t.AssignedByUserId equals byUser.Id
        join doneUser in _dbContext.User.AsNoTracking() on t.CompletedByUserId equals (Guid?)doneUser.Id into completedBy
        from doneUser in completedBy.DefaultIfEmpty()
        select new UserTaskDto
        {
            Id = t.Id,
            Title = t.Title,
            Description = t.Description,
            AssignedToUserId = t.AssignedToUserId,
            AssignedToName = (toUser.FirstName + " " + toUser.LastName).Trim(),
            AssignedByUserId = t.AssignedByUserId,
            AssignedByName = (byUser.FirstName + " " + byUser.LastName).Trim(),
            DueDate = t.DueDate,
            Priority = t.Priority,
            Status = t.Status,
            CreatedDate = t.CreatedDate,
            CompletedDate = t.CompletedDate,
            CompletedByName = doneUser == null ? null : (doneUser.FirstName + " " + doneUser.LastName).Trim(),
        };

    public async Task<IReadOnlyList<UserTaskDto>> GetTasksForUserAsync(Guid userId, CancellationToken token) =>
        await TaskQuery()
            .Where(t => t.AssignedToUserId == userId || t.AssignedByUserId == userId)
            .OrderBy(t => t.Status == UserTaskStatus.Completed)
            .ThenBy(t => t.DueDate)
            .ThenByDescending(t => t.CreatedDate)
            .ToListAsync(token);

    public Task<UserTaskDto?> GetTaskAsync(Guid taskId, CancellationToken token) =>
        TaskQuery().FirstOrDefaultAsync(t => t.Id == taskId, token);

    private async Task<string> UserNameAsync(Guid userId, CancellationToken token)
    {
        var user = await _dbContext.User.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new { u.FirstName, u.LastName, u.FullName })
            .FirstOrDefaultAsync(token);
        if (user == null) return "A user";
        return !string.IsNullOrWhiteSpace(user.FullName) ? user.FullName!.Trim() : $"{user.FirstName} {user.LastName}".Trim();
    }

    /// <summary>One Notification + one NotificationDetails row for a single recipient (existing notification model).</summary>
    private Notification AddNotification(Guid fromUserId, Guid toUserId, NotificationType type, string message, DateTime now)
    {
        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            NotificationType = (int)type,
            Message = message,
            CreatedBy = fromUserId,
            CreatedDate = now,
            IsActive = true,
        };
        _dbContext.Notification.Add(notification);
        _dbContext.NotificationDetails.Add(new NotificationDetails
        {
            Id = Guid.NewGuid(),
            NotificationId = notification.Id,
            FromUserId = fromUserId,
            ToUserId = toUserId,
            CreatedBy = fromUserId,
            CreatedDate = now,
            IsActive = true,
            IsRead = false,
        });
        return notification;
    }

    public async Task<Guid> CreateTaskAsync(Guid assignedByUserId, Guid assignedToUserId, string title, string description,
        DateTime dueDate, string? priority, CancellationToken token)
    {
        var now = DateTime.UtcNow;
        var task = new UserTask
        {
            Id = Guid.NewGuid(),
            Title = title,
            Description = description,
            AssignedToUserId = assignedToUserId,
            AssignedByUserId = assignedByUserId,
            DueDate = dueDate,
            Priority = priority,
            Status = UserTaskStatus.Pending,
            CreatedBy = assignedByUserId,
            CreatedDate = now,
            IsActive = true,
        };

        await using var transaction = await _dbContext.Database.BeginTransactionAsync(token);
        _dbContext.UserTask.Add(task);

        // Self-assigned tasks need no "you have a task" notification.
        if (assignedToUserId != assignedByUserId)
        {
            var assignerName = await UserNameAsync(assignedByUserId, token);
            var message =
                $"<b>{WebUtility.HtmlEncode(assignerName)}</b> assigned you a task: <b>{WebUtility.HtmlEncode(title)}</b>" +
                $" (due {dueDate:dd-MMM-yyyy}{(string.IsNullOrWhiteSpace(priority) ? "" : $", {WebUtility.HtmlEncode(priority)} priority")}). " +
                "Open My Calendar → Tasks to view the details.";
            task.AssignedNotificationId = AddNotification(assignedByUserId, assignedToUserId, NotificationType.TaskAssigned, message, now).Id;
        }

        await _dbContext.SaveChangesAsync(token);
        await transaction.CommitAsync(token);
        return task.Id;
    }

    public async Task<CompleteTaskOutcome> CompleteTaskAsync(Guid taskId, Guid callerUserId, CancellationToken token)
    {
        var task = await _dbContext.UserTask.AsNoTracking()
            .Where(t => t.Id == taskId && t.IsActive)
            .Select(t => new { t.AssignedToUserId, t.AssignedByUserId, t.Title, t.Status })
            .FirstOrDefaultAsync(token);
        if (task == null) return CompleteTaskOutcome.NotFound;
        if (task.AssignedToUserId != callerUserId) return CompleteTaskOutcome.NotAssignee;
        if (task.Status == UserTaskStatus.Completed) return CompleteTaskOutcome.AlreadyCompleted;

        var now = DateTime.UtcNow;
        await using var transaction = await _dbContext.Database.BeginTransactionAsync(token);

        // Conditional update: only the assignee, only while Pending. A second (or concurrent) submission
        // affects 0 rows, so it cannot complete the task again or send a second notification.
        var updated = await _dbContext.UserTask
            .Where(t => t.Id == taskId && t.IsActive && t.AssignedToUserId == callerUserId && t.Status == UserTaskStatus.Pending)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(t => t.Status, UserTaskStatus.Completed)
                .SetProperty(t => t.CompletedDate, now)
                .SetProperty(t => t.CompletedByUserId, callerUserId)
                .SetProperty(t => t.ModifiedBy, callerUserId)
                .SetProperty(t => t.ModifiedDate, now), token);
        if (updated == 0)
        {
            await transaction.RollbackAsync(token);
            return CompleteTaskOutcome.AlreadyCompleted;
        }

        // Notify the original assigner only (not when they completed their own task).
        if (task.AssignedByUserId != callerUserId)
        {
            var completerName = await UserNameAsync(callerUserId, token);
            var message =
                $"<b>{WebUtility.HtmlEncode(completerName)}</b> marked the task <b>{WebUtility.HtmlEncode(task.Title)}</b> as <b>Completed</b>.";
            var notification = AddNotification(callerUserId, task.AssignedByUserId, NotificationType.TaskCompleted, message, now);
            await _dbContext.SaveChangesAsync(token);

            await _dbContext.UserTask
                .Where(t => t.Id == taskId)
                .ExecuteUpdateAsync(setters => setters.SetProperty(t => t.CompletedNotificationId, notification.Id), token);
        }

        await transaction.CommitAsync(token);
        return CompleteTaskOutcome.Completed;
    }

    // ─── Demo status workflow ─────────────────────────────────────────────────────

    public async Task<IReadOnlyList<TypeCodeOption>> GetTypeCodesAsync(IReadOnlyCollection<int>? values, int? groupCode, CancellationToken token)
    {
        var query = _dbContext.Type_Code.AsNoTracking().Where(c => c.IsActive);
        if (values != null) query = query.Where(c => values.Contains(c.TypeCodeValue));
        if (groupCode.HasValue)
        {
            var groupId = await _dbContext.TypeGroup.AsNoTracking()
                .Where(g => g.TypeGroupCode == groupCode.Value).Select(g => (Guid?)g.Id).FirstOrDefaultAsync(token);
            query = query.Where(c => c.TypeGroupId == groupId);
        }
        return await query.OrderBy(c => c.TypeCodeValue)
            .Select(c => new TypeCodeOption(c.Id, c.TypeCodeValue, c.TypeCodeName ?? string.Empty))
            .ToListAsync(token);
    }

    public async Task<IReadOnlyList<MyCalendarFollowUpDto>> GetFollowUpsAsync(
        Guid userId, IReadOnlyCollection<string> roles, int month, int year, CancellationToken token)
    {
        var roleSet = new HashSet<string>(roles, StringComparer.OrdinalIgnoreCase);
        var isCoordinator = roleSet.Contains("Coordinator");
        var isOperations = roleSet.Contains("Operations") || roleSet.Contains("OperationsAdmin");
        var monthStart = new DateTime(year, month, 1);
        var monthEnd = monthStart.AddMonths(1);

        // The latest change per enrolment, shown only while its status is still the enrolment's current
        // status (a later status change, made anywhere, removes the reminder from the calendar).
        // Reminder date = ReminderDate, or FollowUpStartDate for rows saved before single reminders.
        var latest = _dbContext.DemoStatusHistory.AsNoTracking()
            .Where(h => h.IsActive
                && !_dbContext.DemoStatusHistory.Any(n => n.IsActive && n.SalesDetailsId == h.SalesDetailsId && n.CreatedDate > h.CreatedDate));

        var rows = await (
            from h in latest
            join sd in _dbContext.SalesDetails.AsNoTracking() on h.SalesDetailsId equals sd.Id
            join sa in _dbContext.Sales.AsNoTracking() on sd.SalesId equals sa.Id
            join code in _dbContext.Type_Code.AsNoTracking() on h.StatusId equals code.Id
            let reminder = h.ReminderDate ?? h.FollowUpStartDate
            where sd.IsActive && sd.Status == h.StatusId
                && reminder != null
                && reminder < monthEnd
                && reminder >= monthStart
                && (h.CreatedBy == userId
                    || (isCoordinator && sd.Coordinator == userId)
                    || (isOperations && sa.Ownership == userId))
            select new
            {
                h.Id, h.SalesDetailsId, sd.SalesId, sd.Coordinator, sd.SubjectId, sd.TutorId, sa.StudentId,
                h.StatusId, code.TypeCodeValue, code.TypeCodeName,
                Reminder = reminder!.Value,
            })
            .ToListAsync(token);
        if (rows.Count == 0) return Array.Empty<MyCalendarFollowUpDto>();

        var studentIds = rows.Where(r => r.StudentId.HasValue).Select(r => r.StudentId!.Value).Distinct().ToList();
        var studentNames = await (
            from st in _dbContext.Student.AsNoTracking()
            join u in _dbContext.User.AsNoTracking() on st.UserId equals u.Id
            where studentIds.Contains(st.Id)
            select new { st.Id, u.FirstName, u.LastName })
            .ToDictionaryAsync(x => x.Id, x => $"{x.FirstName} {x.LastName}".Trim(), token);
        // SalesDetails.TutorId holds the Tutor.Id (older rows may hold the tutor's User.Id).
        var tutorIds = rows.Where(r => r.TutorId.HasValue).Select(r => r.TutorId!.Value).Distinct().ToList();
        var tutorNames = await (
            from t in _dbContext.Tutor.AsNoTracking()
            join u in _dbContext.User.AsNoTracking() on t.UserId equals u.Id
            where tutorIds.Contains(t.Id) || tutorIds.Contains(u.Id)
            select new { t.Id, UserId = u.Id, u.FirstName, u.LastName })
            .ToListAsync(token);
        var subjectIds = rows.Select(r => r.SubjectId).Distinct().ToList();
        var subjectNames = await _dbContext.Type_Code.AsNoTracking()
            .Where(c => subjectIds.Contains(c.Id))
            .ToDictionaryAsync(c => c.Id, c => c.TypeCodeName, token);

        return rows.Select(r =>
        {
            var tutor = r.TutorId.HasValue ? tutorNames.FirstOrDefault(t => t.Id == r.TutorId || t.UserId == r.TutorId) : null;
            return new MyCalendarFollowUpDto
            {
                HistoryId = r.Id,
                SalesDetailsId = r.SalesDetailsId,
                SalesId = r.SalesId,
                CoordinatorUserId = r.Coordinator,
                StudentName = r.StudentId.HasValue && studentNames.TryGetValue(r.StudentId.Value, out var sn) ? sn : null,
                TutorName = tutor == null ? "NA" : $"{tutor.FirstName} {tutor.LastName}".Trim(),
                SubjectName = subjectNames.TryGetValue(r.SubjectId, out var subject) ? subject : null,
                StatusId = r.StatusId,
                StatusCode = r.TypeCodeValue,
                StatusName = r.TypeCodeName,
                ReminderDate = r.Reminder,
            };
        }).OrderBy(r => r.ReminderDate).ToList();
    }

    public async Task<EnrollmentStatusState?> GetEnrollmentStatusAsync(Guid salesDetailsId, CancellationToken token)
    {
        var sd = await _dbContext.SalesDetails.AsNoTracking()
            .Where(x => x.Id == salesDetailsId && x.IsActive)
            .Select(x => new { x.Id, x.Coordinator, x.Status })
            .FirstOrDefaultAsync(token);
        if (sd == null) return null;

        var current = new EnrollmentStatusState { SalesDetailsId = sd.Id, CoordinatorUserId = sd.Coordinator };
        if (sd.Status != Guid.Empty)
        {
            var code = await _dbContext.Type_Code.AsNoTracking()
                .Where(c => c.Id == sd.Status).Select(c => new { c.TypeCodeValue, c.TypeCodeName }).FirstOrDefaultAsync(token);
            current.StatusId = sd.Status;
            current.StatusCode = code?.TypeCodeValue;
            current.StatusName = code?.TypeCodeName;
        }

        var last = await _dbContext.DemoStatusHistory.AsNoTracking()
            .Where(h => h.SalesDetailsId == salesDetailsId && h.IsActive)
            .OrderByDescending(h => h.CreatedDate)
            .FirstOrDefaultAsync(token);
        if (last != null)
        {
            current.LastHistoryStatusId = last.StatusId;
            current.FollowUpStartDate = last.FollowUpStartDate;
            current.FollowUpEndDate = last.FollowUpEndDate;
            current.ReminderDate = last.ReminderDate ?? last.FollowUpStartDate;
            current.DropoutReasonId = last.DropoutReasonId;
            current.ChangedDate = last.CreatedDate;
            if (last.DropoutReasonId.HasValue)
                current.DropoutReasonName = await _dbContext.Type_Code.AsNoTracking()
                    .Where(c => c.Id == last.DropoutReasonId).Select(c => c.TypeCodeName).FirstOrDefaultAsync(token);
            current.ChangedByName = await _dbContext.User.AsNoTracking()
                .Where(u => u.Id == last.CreatedBy).Select(u => (u.FirstName + " " + u.LastName).Trim()).FirstOrDefaultAsync(token);
        }
        return current;
    }

    public async Task<DemoStatusUpdateOutcome> UpdateDemoStatusAsync(Guid salesDetailsId, Guid callerUserId, Guid statusId,
        DateTime? reminderDate, Guid? dropoutReasonId, CancellationToken token)
    {
        await using var transaction = await _dbContext.Database.BeginTransactionAsync(token);

        var salesDetails = await _dbContext.SalesDetails.FirstOrDefaultAsync(sd => sd.Id == salesDetailsId && sd.IsActive, token);
        if (salesDetails == null) return DemoStatusUpdateOutcome.NotFound;
        // Ownership is checked again inside the transaction, against the stored Coordinator.
        if (salesDetails.Coordinator != callerUserId) return DemoStatusUpdateOutcome.NotOwner;

        // A repeated submission of the same change adds nothing.
        var last = await _dbContext.DemoStatusHistory.AsNoTracking()
            .Where(h => h.SalesDetailsId == salesDetailsId && h.IsActive)
            .OrderByDescending(h => h.CreatedDate)
            .FirstOrDefaultAsync(token);
        if (salesDetails.Status == statusId && last != null && last.StatusId == statusId
            && (last.ReminderDate ?? last.FollowUpStartDate) == reminderDate && last.DropoutReasonId == dropoutReasonId)
        {
            await transaction.RollbackAsync(token);
            return DemoStatusUpdateOutcome.NoChange;
        }

        var now = DateTime.UtcNow;
        _dbContext.DemoStatusHistory.Add(new DemoStatusHistory
        {
            Id = Guid.NewGuid(),
            SalesDetailsId = salesDetailsId,
            StatusId = statusId,
            PreviousStatusId = salesDetails.Status == Guid.Empty ? null : salesDetails.Status,
            // New changes store a single reminder date; the old range columns stay empty for them.
            ReminderDate = reminderDate,
            DropoutReasonId = dropoutReasonId,
            CreatedBy = callerUserId,
            CreatedDate = now,
            IsActive = true,
        });

        salesDetails.Status = statusId;
        // Existing pages read the single FollowUpDate: keep it in step with the reminder date.
        if (reminderDate.HasValue) salesDetails.FollowUpDate = reminderDate;
        salesDetails.ModifiedBy = callerUserId;
        salesDetails.ModifiedDate = now;

        await _dbContext.SaveChangesAsync(token);
        await transaction.CommitAsync(token);
        return DemoStatusUpdateOutcome.Updated;
    }
}
