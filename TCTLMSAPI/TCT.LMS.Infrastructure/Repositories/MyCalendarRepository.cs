using System.Net;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
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
    /// <summary>Document.DocumentTypeId of task verification proof files (same convention as the assessment documents).</summary>
    private static readonly Guid TaskProofDocumentTypeId = new("A0000000-0000-0000-0000-000000000003");
    private readonly ApplicationDbContext _dbContext;
    private readonly string _proofStoragePath;

    public MyCalendarRepository(ApplicationDbContext dbContext, IConfiguration configuration)
    {
        _dbContext = dbContext;
        // Same storage root as FileService ("FileDirectory", default FileStorage).
        _proofStoragePath = Path.GetFullPath(Path.Combine(configuration["FileDirectory"] ?? "FileStorage", "TaskVerification"));
    }

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
            DueTime = t.DueTime,
            WorkflowStatus = t.WorkflowStatus,
        };

    public async Task<IReadOnlyList<UserTaskDto>> GetTasksForUserAsync(Guid userId, CancellationToken token) =>
        await WithVerificationAsync(await TaskQuery()
            .Where(t => t.AssignedToUserId == userId || t.AssignedByUserId == userId)
            .OrderBy(t => t.Status == UserTaskStatus.Completed)
            .ThenBy(t => t.DueDate)
            .ThenByDescending(t => t.CreatedDate)
            .ToListAsync(token), token);

    public async Task<UserTaskDto?> GetTaskAsync(Guid taskId, CancellationToken token)
    {
        var task = await TaskQuery().FirstOrDefaultAsync(t => t.Id == taskId, token);
        return task == null ? null : (await WithVerificationAsync(new List<UserTaskDto> { task }, token))[0];
    }

    /// <summary>Sets each task's effective workflow status and attaches its verification history (with proof files), newest first.</summary>
    private async Task<List<UserTaskDto>> WithVerificationAsync(List<UserTaskDto> tasks, CancellationToken token)
    {
        foreach (var task in tasks) task.VerificationStatus = UserTaskWorkflowStatus.Effective(task.Status, task.WorkflowStatus);

        // Every workflow action sets WorkflowStatus, so tasks without it have no history.
        var taskIds = tasks.Where(t => t.WorkflowStatus != null).Select(t => t.Id).ToList();
        if (taskIds.Count == 0) return tasks;

        var history = await (
            from h in _dbContext.UserTaskVerificationHistory.AsNoTracking()
            where h.IsActive && taskIds.Contains(h.UserTaskId)
            join u in _dbContext.User.AsNoTracking() on h.PerformedByUserId equals u.Id into performedBy
            from u in performedBy.DefaultIfEmpty()
            orderby h.PerformedDate descending
            select new UserTaskVerificationHistoryDto
            {
                Id = h.Id,
                UserTaskId = h.UserTaskId,
                Action = h.Action,
                PreviousStatus = h.PreviousStatus,
                NewStatus = h.NewStatus,
                Comments = h.Comments,
                PerformedByUserId = h.PerformedByUserId,
                PerformedByName = u == null ? null : (u.FirstName + " " + u.LastName).Trim(),
                PerformedDate = h.PerformedDate,
            }).ToListAsync(token);

        var historyIds = history.Select(h => h.Id).ToList();
        var files = historyIds.Count == 0
            ? new List<(Guid HistoryId, UserTaskAttachmentDto File)>()
            : (await (
                from d in _dbContext.Documents.AsNoTracking()
                join s in _dbContext.DocumentStorage.AsNoTracking() on d.Id equals s.DocumentId
                where d.IsActive && s.IsActive && d.DocumentTypeId == TaskProofDocumentTypeId
                    && d.ReferenceId != null && historyIds.Contains(d.ReferenceId.Value)
                orderby s.CreatedDate
                select new { HistoryId = d.ReferenceId!.Value, s.Id, s.FileName, s.ContentType, s.FileSize }).ToListAsync(token))
                .Select(f => (f.HistoryId, File: new UserTaskAttachmentDto(f.Id, f.FileName, f.ContentType, f.FileSize)))
                .ToList();

        foreach (var entry in history)
            entry.Attachments = files.Where(f => f.HistoryId == entry.Id).Select(f => f.File).ToList();
        foreach (var task in tasks)
            task.VerificationHistory = history.Where(h => h.UserTaskId == task.Id).ToList();
        return tasks;
    }

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
        DateTime dueDate, TimeSpan? dueTime, string? priority, CancellationToken token)
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
            DueTime = dueTime,
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
                $" (due {dueDate:dd-MMM-yyyy}{(dueTime.HasValue ? $" {dueDate.Add(dueTime.Value):hh:mm tt}" : "")}{(string.IsNullOrWhiteSpace(priority) ? "" : $", {WebUtility.HtmlEncode(priority)} priority")}). " +
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

    // ─── Task verification workflow ───────────────────────────────────────────────

    public async Task<IReadOnlyList<UserTaskDto>> GetPendingVerificationTasksAsync(Guid? assignedByUserId, CancellationToken token)
    {
        var query = TaskQuery().Where(t => t.Status == UserTaskStatus.Completed && t.WorkflowStatus == UserTaskWorkflowStatus.PendingVerification);
        if (assignedByUserId.HasValue)
        {
            var assigner = assignedByUserId.Value;
            query = query.Where(t => t.AssignedByUserId == assigner);
        }
        return await WithVerificationAsync(await query.OrderBy(t => t.DueDate).ThenBy(t => t.CreatedDate).ToListAsync(token), token);
    }

    private sealed record TaskSnapshot(Guid AssignedToUserId, Guid AssignedByUserId, string Title, string Status, string? WorkflowStatus);

    private Task<TaskSnapshot?> TaskSnapshotAsync(Guid taskId, CancellationToken token) =>
        _dbContext.UserTask.AsNoTracking()
            .Where(t => t.Id == taskId && t.IsActive)
            .Select(t => new TaskSnapshot(t.AssignedToUserId, t.AssignedByUserId, t.Title, t.Status, t.WorkflowStatus))
            .FirstOrDefaultAsync(token);

    private UserTaskVerificationHistory AddHistory(Guid taskId, string action, string previousStatus, string newStatus,
        string? comments, Guid userId, DateTime now)
    {
        var history = new UserTaskVerificationHistory
        {
            Id = Guid.NewGuid(),
            UserTaskId = taskId,
            Action = action,
            PreviousStatus = previousStatus,
            NewStatus = newStatus,
            Comments = comments,
            PerformedByUserId = userId,
            PerformedDate = now,
            CreatedBy = userId,
            CreatedDate = now,
            IsActive = true,
        };
        _dbContext.UserTaskVerificationHistory.Add(history);
        return history;
    }

    public async Task<TaskWorkflowOutcome> StartTaskAsync(Guid taskId, Guid callerUserId, CancellationToken token)
    {
        var task = await TaskSnapshotAsync(taskId, token);
        if (task == null) return TaskWorkflowOutcome.NotFound;
        if (task.AssignedToUserId != callerUserId) return TaskWorkflowOutcome.NotAssignee;
        if (task.Status != UserTaskStatus.Pending || task.WorkflowStatus != null) return TaskWorkflowOutcome.InvalidState;

        var now = DateTime.UtcNow;
        await using var transaction = await _dbContext.Database.BeginTransactionAsync(token);
        // Conditional update: only the assignee, only from Assigned (repeated requests affect 0 rows).
        var updated = await _dbContext.UserTask
            .Where(t => t.Id == taskId && t.IsActive && t.AssignedToUserId == callerUserId
                && t.Status == UserTaskStatus.Pending && t.WorkflowStatus == null)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(t => t.WorkflowStatus, UserTaskWorkflowStatus.InProgress)
                .SetProperty(t => t.ModifiedBy, callerUserId)
                .SetProperty(t => t.ModifiedDate, now), token);
        if (updated == 0)
        {
            await transaction.RollbackAsync(token);
            return TaskWorkflowOutcome.InvalidState;
        }

        AddHistory(taskId, UserTaskVerificationAction.Started, UserTaskWorkflowStatus.Assigned, UserTaskWorkflowStatus.InProgress, null, callerUserId, now);
        await _dbContext.SaveChangesAsync(token);
        await transaction.CommitAsync(token);
        return TaskWorkflowOutcome.Done;
    }

    public async Task<TaskWorkflowOutcome> SubmitForVerificationAsync(Guid taskId, Guid callerUserId, string? notes,
        IReadOnlyList<TaskVerificationFile> files, CancellationToken token)
    {
        var task = await TaskSnapshotAsync(taskId, token);
        if (task == null) return TaskWorkflowOutcome.NotFound;
        if (task.AssignedToUserId != callerUserId) return TaskWorkflowOutcome.NotAssignee;
        if (task.AssignedByUserId == callerUserId) return TaskWorkflowOutcome.SelfAssigned;
        // Assigned / In Progress: completing the task submits it (one step). Completed: an older task completed before
        // the workflow (or with the plain Complete action). Changes Requested: a resubmission.
        var previous = UserTaskWorkflowStatus.Effective(task.Status, task.WorkflowStatus);
        if (previous is not (UserTaskWorkflowStatus.Assigned or UserTaskWorkflowStatus.InProgress
            or UserTaskWorkflowStatus.Completed or UserTaskWorkflowStatus.ChangesRequested))
            return TaskWorkflowOutcome.InvalidState;
        var completing = task.Status == UserTaskStatus.Pending;

        var now = DateTime.UtcNow;
        var saved = new List<(TaskVerificationFile File, string Path)>();
        try
        {
            // Files first; only these newly written files are removed if anything below fails.
            if (files.Count > 0) Directory.CreateDirectory(_proofStoragePath);
            foreach (var file in files)
            {
                var path = Path.Combine(_proofStoragePath, Guid.NewGuid().ToString("N") + Path.GetExtension(file.FileName).ToLowerInvariant());
                saved.Add((file, path));
                await using var stream = new FileStream(path, FileMode.CreateNew);
                await file.Content.CopyToAsync(stream, token);
            }

            await using var transaction = await _dbContext.Database.BeginTransactionAsync(token);
            // Conditional update: only the assignee, only from the status read above (Status and WorkflowStatus both
            // matched) — a repeated or concurrent submission affects 0 rows and sends no second notification.
            // Completing sets the existing completion fields the same way CompleteTaskAsync does.
            var updated = await _dbContext.UserTask
                .Where(t => t.Id == taskId && t.IsActive && t.AssignedToUserId == callerUserId && t.AssignedByUserId != callerUserId
                    && t.Status == task.Status && t.WorkflowStatus == task.WorkflowStatus)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(t => t.Status, UserTaskStatus.Completed)
                    .SetProperty(t => t.CompletedDate, t => completing ? now : t.CompletedDate)
                    .SetProperty(t => t.CompletedByUserId, t => completing ? callerUserId : t.CompletedByUserId)
                    .SetProperty(t => t.WorkflowStatus, UserTaskWorkflowStatus.PendingVerification)
                    .SetProperty(t => t.ModifiedBy, callerUserId)
                    .SetProperty(t => t.ModifiedDate, now), token);
            if (updated == 0)
            {
                await transaction.RollbackAsync(token);
                DeleteFiles(saved);
                return TaskWorkflowOutcome.InvalidState;
            }

            var resubmission = previous == UserTaskWorkflowStatus.ChangesRequested;
            var history = AddHistory(taskId, resubmission ? UserTaskVerificationAction.Resubmitted : UserTaskVerificationAction.Submitted,
                previous, UserTaskWorkflowStatus.PendingVerification, notes, callerUserId, now);

            // The EF model has no Document → DocumentStorage relationship, so in a single SaveChanges EF may insert
            // DocumentStorage first and violate FK_DocumentStorage_Documents. Documents are therefore saved before
            // their storage rows (as AssessmentRepository does), both inside this transaction.
            var storages = new List<DocumentStorage>();
            foreach (var (file, path) in saved)
            {
                var document = new Document
                {
                    Id = Guid.NewGuid(),
                    UserId = callerUserId,
                    DocumentName = "Task Verification Proof",
                    DocumentDescription = task.Title,
                    ReferenceId = history.Id,
                    DocumentTypeId = TaskProofDocumentTypeId,
                    CreatedBy = callerUserId,
                    CreatedDate = now,
                    IsActive = true,
                };
                _dbContext.Documents.Add(document);
                storages.Add(new DocumentStorage
                {
                    Id = Guid.NewGuid(),
                    DocumentId = document.Id,
                    FileName = Path.GetFileName(file.FileName),
                    FilePath = path,
                    ContentType = ProofContentType(file.FileName),
                    FileSize = file.Length.ToString(),
                    CreatedBy = callerUserId,
                    CreatedDate = now,
                    IsActive = true,
                });
            }
            await _dbContext.SaveChangesAsync(token);
            _dbContext.DocumentStorage.AddRange(storages);

            var submitterName = await UserNameAsync(callerUserId, token);
            var message =
                $"<b>{WebUtility.HtmlEncode(submitterName)}</b> {(resubmission ? "resubmitted" : completing ? "completed and submitted" : "submitted")} the task " +
                $"<b>{WebUtility.HtmlEncode(task.Title)}</b> for verification. Open My Calendar → Tasks → Pending Verification to review it.";
            var notification = AddNotification(callerUserId, task.AssignedByUserId, NotificationType.TaskVerificationSubmitted, message, now);
            history.NotificationId = notification.Id;
            await _dbContext.SaveChangesAsync(token);

            // One notification only: when this step completed the task, it is also the completion notification.
            if (completing)
                await _dbContext.UserTask
                    .Where(t => t.Id == taskId)
                    .ExecuteUpdateAsync(setters => setters.SetProperty(t => t.CompletedNotificationId, notification.Id), token);

            await transaction.CommitAsync(token);
            return TaskWorkflowOutcome.Done;
        }
        catch
        {
            DeleteFiles(saved);
            throw;
        }
    }

    public async Task<TaskWorkflowOutcome> ReviewTaskAsync(Guid taskId, Guid callerUserId, bool callerIsAdmin, bool approve,
        string? comment, CancellationToken token)
    {
        var task = await TaskSnapshotAsync(taskId, token);
        if (task == null) return TaskWorkflowOutcome.NotFound;
        // Never the assignee (also not an administrator reviewing their own task); otherwise the assigner or an administrator.
        if (task.AssignedToUserId == callerUserId || (task.AssignedByUserId != callerUserId && !callerIsAdmin))
            return TaskWorkflowOutcome.NotVerifier;
        if (task.Status != UserTaskStatus.Completed || task.WorkflowStatus != UserTaskWorkflowStatus.PendingVerification)
            return TaskWorkflowOutcome.InvalidState;

        var newStatus = approve ? UserTaskWorkflowStatus.Verified : UserTaskWorkflowStatus.ChangesRequested;
        var now = DateTime.UtcNow;
        await using var transaction = await _dbContext.Database.BeginTransactionAsync(token);
        // The permission and status checks are repeated in the update itself, so a concurrent review affects 0 rows.
        var updated = await _dbContext.UserTask
            .Where(t => t.Id == taskId && t.IsActive && t.Status == UserTaskStatus.Completed
                && t.WorkflowStatus == UserTaskWorkflowStatus.PendingVerification
                && t.AssignedToUserId != callerUserId && (t.AssignedByUserId == callerUserId || callerIsAdmin))
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(t => t.WorkflowStatus, newStatus)
                .SetProperty(t => t.ModifiedBy, callerUserId)
                .SetProperty(t => t.ModifiedDate, now), token);
        if (updated == 0)
        {
            await transaction.RollbackAsync(token);
            return TaskWorkflowOutcome.InvalidState;
        }

        var history = AddHistory(taskId, approve ? UserTaskVerificationAction.Verified : UserTaskVerificationAction.ChangesRequested,
            UserTaskWorkflowStatus.PendingVerification, newStatus, comment, callerUserId, now);

        var reviewerName = await UserNameAsync(callerUserId, token);
        var message = approve
            ? $"<b>{WebUtility.HtmlEncode(reviewerName)}</b> verified the task <b>{WebUtility.HtmlEncode(task.Title)}</b>." +
              (string.IsNullOrWhiteSpace(comment) ? "" : $" Comment: {WebUtility.HtmlEncode(Shorten(comment))}")
            : $"<b>{WebUtility.HtmlEncode(reviewerName)}</b> requested changes to the task <b>{WebUtility.HtmlEncode(task.Title)}</b>: " +
              $"{WebUtility.HtmlEncode(Shorten(comment ?? ""))} Open My Calendar → Tasks to update and resubmit it.";
        history.NotificationId = AddNotification(callerUserId, task.AssignedToUserId,
            approve ? NotificationType.TaskVerified : NotificationType.TaskChangesRequested, message, now).Id;

        await _dbContext.SaveChangesAsync(token);
        await transaction.CommitAsync(token);
        return TaskWorkflowOutcome.Done;
    }

    public Task<UserTaskAttachmentFile?> GetTaskAttachmentAsync(Guid attachmentId, CancellationToken token) =>
        (from s in _dbContext.DocumentStorage.AsNoTracking()
         join d in _dbContext.Documents.AsNoTracking() on s.DocumentId equals d.Id
         join h in _dbContext.UserTaskVerificationHistory.AsNoTracking() on d.ReferenceId equals (Guid?)h.Id
         where s.Id == attachmentId && s.IsActive && d.IsActive && h.IsActive && d.DocumentTypeId == TaskProofDocumentTypeId
         select new UserTaskAttachmentFile(h.UserTaskId, s.FileName, s.ContentType, s.FilePath)).FirstOrDefaultAsync(token);

    // ─── Deadline reminders ───────────────────────────────────────────────────────

    public async Task<IReadOnlyList<TaskReminderCandidate>> GetDueTaskRemindersAsync(DateTime now, CancellationToken token)
    {
        // Every milestone falls between the day after the due date (overdue) and seven days before it.
        var fromDate = now.Date.AddDays(-1);
        var toDate = now.Date.AddDays(7);
        var tasks = await _dbContext.UserTask.AsNoTracking()
            .Where(t => t.IsActive && t.Status == UserTaskStatus.Pending && t.DueDate >= fromDate && t.DueDate < toDate.AddDays(1))
            .Select(t => new { t.Id, t.Title, t.AssignedToUserId, t.AssignedByUserId, t.DueDate, t.DueTime })
            .ToListAsync(token);

        var due = tasks
            .Select(t => new TaskReminderCandidate(t.Id, t.Title, t.AssignedToUserId, t.AssignedByUserId, t.DueDate, t.DueTime,
                UserTaskDeadline.ReminderMilestone(t.DueDate, t.DueTime, now) ?? ""))
            .Where(r => r.Milestone != "")
            .ToList();
        if (due.Count == 0) return due;

        var taskIds = due.Select(r => r.TaskId).ToList();
        var sent = (await _dbContext.UserTaskReminder.AsNoTracking()
                .Where(r => taskIds.Contains(r.UserTaskId))
                .Select(r => new { r.UserTaskId, r.RecipientUserId, r.Milestone })
                .ToListAsync(token))
            .Select(r => (r.UserTaskId, r.RecipientUserId, r.Milestone))
            .ToHashSet();
        return due.Where(r => !sent.Contains((r.TaskId, r.AssignedToUserId, r.Milestone))).ToList();
    }

    public async Task<bool> SendTaskReminderAsync(TaskReminderCandidate reminder, CancellationToken token)
    {
        var now = DateTime.UtcNow;
        await using var transaction = await _dbContext.Database.BeginTransactionAsync(token);
        try
        {
            // Checked again inside the transaction: a task completed or submitted since it was listed gets no reminder.
            var stillOpen = await _dbContext.UserTask.AnyAsync(
                t => t.Id == reminder.TaskId && t.IsActive && t.Status == UserTaskStatus.Pending, token);
            if (!stillOpen) return false;

            var deadline = $"{reminder.DueDate:dd-MMM-yyyy}{(reminder.DueTime.HasValue ? $" {reminder.DueDate.Date.Add(reminder.DueTime.Value):hh:mm tt}" : "")}";
            var title = WebUtility.HtmlEncode(reminder.Title);
            var overdue = reminder.Milestone == UserTaskDeadline.Overdue;
            var message = reminder.Milestone switch
            {
                UserTaskDeadline.SevenDaysBefore => $"Reminder: the task <b>{title}</b> is due in 7 days (due {deadline}).",
                UserTaskDeadline.DayBefore => $"Reminder: the task <b>{title}</b> is due tomorrow (due {deadline}).",
                UserTaskDeadline.DueDate => $"Reminder: the task <b>{title}</b> is due today (due {deadline}).",
                _ => $"The task <b>{title}</b> is <b>overdue</b>. It was due {deadline}.",
            } + " Open My Calendar → Tasks to view the details.";

            var notification = AddNotification(reminder.AssignedByUserId, reminder.AssignedToUserId,
                overdue ? NotificationType.TaskOverdue : NotificationType.TaskDueReminder, message, now);
            _dbContext.UserTaskReminder.Add(new UserTaskReminder
            {
                Id = Guid.NewGuid(),
                UserTaskId = reminder.TaskId,
                RecipientUserId = reminder.AssignedToUserId,
                Milestone = reminder.Milestone,
                NotificationId = notification.Id,
                SentDate = now,
            });
            // The reminder row and its notification are saved together: the unique index rejects a reminder that
            // another run already sent, and the notification is rolled back with it.
            await _dbContext.SaveChangesAsync(token);
            await transaction.CommitAsync(token);
            return true;
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException sql && (sql.Number == 2601 || sql.Number == 2627))
        {
            return false;
        }
        finally
        {
            // The reminder job sends each reminder with its own context; nothing tracked here is reused.
            _dbContext.ChangeTracker.Clear();
        }
    }

    private static string Shorten(string text) => text.Length <= 300 ? text : text[..297] + "...";

    private static void DeleteFiles(IEnumerable<(TaskVerificationFile File, string Path)> saved)
    {
        foreach (var (_, path) in saved)
        {
            try { if (File.Exists(path)) File.Delete(path); }
            catch (IOException) { /* best effort: an orphaned file must not hide the original error */ }
        }
    }

    private static string ProofContentType(string fileName) => Path.GetExtension(fileName).ToLowerInvariant() switch
    {
        ".pdf" => "application/pdf",
        ".png" => "image/png",
        ".jpg" or ".jpeg" => "image/jpeg",
        ".doc" => "application/msword",
        ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".xls" => "application/vnd.ms-excel",
        ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".txt" => "text/plain",
        _ => "application/octet-stream",
    };

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
