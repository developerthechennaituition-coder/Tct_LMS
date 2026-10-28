using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;

namespace TCT.LMS.Application.Services;

/// <summary>Rules for My Calendar and its Tasks tab. The caller's id and roles always come from the JWT.</summary>
public sealed class MyCalendarService : IMyCalendarService
{
    private static readonly string[] ExcludedRoleNames = { "Tutor", "Student" };
    private static readonly HashSet<string> Priorities = new(StringComparer.OrdinalIgnoreCase) { "Low", "Medium", "High" };
    private const int TitleMaxLength = 200;
    private const int DescriptionMaxLength = 2000;

    private readonly IMyCalendarRepository _repository;

    public MyCalendarService(IMyCalendarRepository repository) => _repository = repository;

    public IReadOnlyCollection<string> ExcludedRoles => ExcludedRoleNames;

    public bool IsEligible(IReadOnlyCollection<string> callerRoles) =>
        callerRoles.Any(role => !string.IsNullOrWhiteSpace(role)
            && !ExcludedRoleNames.Contains(role.Trim(), StringComparer.OrdinalIgnoreCase));

    public async Task<MyCalendarResult<IReadOnlyList<MyCalendarDemoDto>>> GetDemoSchedulesAsync(
        Guid callerUserId, IReadOnlyCollection<string> callerRoles, int month, int year, CancellationToken token)
    {
        if (month < 1 || month > 12 || year < 2000 || year > 2100)
            return MyCalendarResult<IReadOnlyList<MyCalendarDemoDto>>.Fail(400, "Invalid month or year.");
        var data = await _repository.GetDemoSchedulesAsync(callerUserId, callerRoles, month, year, token);
        // Enrolment status label as shown on My Calendar; only the enrolment's own Coordinator may change it.
        var coordinator = IsCoordinator(callerRoles);
        foreach (var row in data)
        {
            row.EnrollmentStatusName = DemoStatusLabel(row.EnrollmentStatusCode) ?? row.EnrollmentStatusName;
            row.CanUpdateStatus = coordinator && row.CoordinatorUserId == callerUserId;
        }
        return MyCalendarResult<IReadOnlyList<MyCalendarDemoDto>>.Ok(data);
    }

    // Regular classes are for Operations / Operations Admin only (students they own) and are shown read-only
    // (no enrolment-status change from a class event). Coordinators and every other role get none.
    private static readonly string[] ClassCalendarRoleNames = { "Operations", "OperationsAdmin" };

    public async Task<MyCalendarResult<IReadOnlyList<MyCalendarDemoDto>>> GetClassSchedulesAsync(
        Guid callerUserId, IReadOnlyCollection<string> callerRoles, int month, int year, CancellationToken token)
    {
        if (month < 1 || month > 12 || year < 2000 || year > 2100)
            return MyCalendarResult<IReadOnlyList<MyCalendarDemoDto>>.Fail(400, "Invalid month or year.");
        var operationsRoles = callerRoles
            .Where(role => ClassCalendarRoleNames.Contains(role?.Trim() ?? string.Empty, StringComparer.OrdinalIgnoreCase))
            .ToList();
        if (operationsRoles.Count == 0)
            return MyCalendarResult<IReadOnlyList<MyCalendarDemoDto>>.Ok(Array.Empty<MyCalendarDemoDto>());
        var data = await _repository.GetClassSchedulesAsync(callerUserId, operationsRoles, month, year, token);
        foreach (var row in data) row.CanUpdateStatus = false;
        return MyCalendarResult<IReadOnlyList<MyCalendarDemoDto>>.Ok(data);
    }

    public Task<IReadOnlyList<TaskAssigneeDto>> GetTaskAssigneesAsync(CancellationToken token) =>
        _repository.GetTaskAssigneesAsync(ExcludedRoleNames, token);

    public Task<IReadOnlyList<UserTaskDto>> GetTasksAsync(Guid callerUserId, CancellationToken token) =>
        _repository.GetTasksForUserAsync(callerUserId, token);

    public async Task<MyCalendarResult<UserTaskDto>> CreateTaskAsync(Guid callerUserId, CreateUserTaskRequest request, CancellationToken token)
    {
        var title = request.Title?.Trim() ?? string.Empty;
        var description = request.Description?.Trim() ?? string.Empty;
        var priority = string.IsNullOrWhiteSpace(request.Priority) ? null : request.Priority.Trim();

        if (request.AssignedToUserId == Guid.Empty)
            return MyCalendarResult<UserTaskDto>.Fail(400, "Please select the user to assign the task to.");
        if (title.Length == 0)
            return MyCalendarResult<UserTaskDto>.Fail(400, "Task title is required.");
        if (title.Length > TitleMaxLength)
            return MyCalendarResult<UserTaskDto>.Fail(400, $"Task title must be {TitleMaxLength} characters or fewer.");
        if (description.Length == 0)
            return MyCalendarResult<UserTaskDto>.Fail(400, "Task description is required.");
        if (description.Length > DescriptionMaxLength)
            return MyCalendarResult<UserTaskDto>.Fail(400, $"Task description must be {DescriptionMaxLength} characters or fewer.");
        if (request.DueDate == null)
            return MyCalendarResult<UserTaskDto>.Fail(400, "Due date is required.");
        // Due date is a calendar day; allow today (any time zone the browser is in is within ±1 day of UTC).
        var dueDate = request.DueDate.Value.Date;
        if (dueDate < DateTime.UtcNow.Date.AddDays(-1))
            return MyCalendarResult<UserTaskDto>.Fail(400, "Due date cannot be in the past.");
        if (priority != null && !Priorities.Contains(priority))
            return MyCalendarResult<UserTaskDto>.Fail(400, "Priority must be Low, Medium or High.");
        if (priority != null)
            priority = Priorities.First(p => p.Equals(priority, StringComparison.OrdinalIgnoreCase));

        // The recipient must be an active user with an eligible (non-Tutor/Student) role — checked here,
        // not only in the browser's list.
        if (!await _repository.IsEligibleAssigneeAsync(request.AssignedToUserId, ExcludedRoleNames, token))
            return MyCalendarResult<UserTaskDto>.Fail(400, "Tasks can only be assigned to active staff users (not tutors or students).");

        var taskId = await _repository.CreateTaskAsync(callerUserId, request.AssignedToUserId, title, description, dueDate, priority, token);
        var task = await _repository.GetTaskAsync(taskId, token);
        return MyCalendarResult<UserTaskDto>.Ok(task!, "Task assigned successfully.");
    }

    public async Task<MyCalendarResult<UserTaskDto>> CompleteTaskAsync(Guid callerUserId, Guid taskId, CancellationToken token)
    {
        var outcome = await _repository.CompleteTaskAsync(taskId, callerUserId, token);
        return outcome switch
        {
            CompleteTaskOutcome.Completed => MyCalendarResult<UserTaskDto>.Ok((await _repository.GetTaskAsync(taskId, token))!, "Task marked as completed."),
            CompleteTaskOutcome.NotFound => MyCalendarResult<UserTaskDto>.Fail(404, "Task not found."),
            CompleteTaskOutcome.NotAssignee => MyCalendarResult<UserTaskDto>.Fail(403, "Only the person this task is assigned to can complete it."),
            _ => MyCalendarResult<UserTaskDto>.Fail(409, "This task is already completed."),
        };
    }

    // ─── Demo status workflow ─────────────────────────────────────────────────────

    private const int DcDroppedCode = 20031;
    private const int DropoutReasonGroupCode = 1008;

    /// <summary>
    /// The 12 statuses offered on My Calendar, in display order: label shown to users → existing lookup code
    /// (TypeGroupCode 200). 20045-20048 were added by TCTDatabase/DDL/DemoStatusWorkflow.sql.
    /// </summary>
    // Reminder = the status needs a single "Remind Me" date.
    private static readonly (int Code, string Label, bool Reminder)[] DemoStatuses =
    {
        (20006, "DP Long Follow-up", true),
        (20009, "DP Short Follow-up", true),
        (20007, "Re-Demo", true),
        (20045, "2nd Re-Demo", true),
        (20046, "Demo Cancelled Tutor Not Available", false),
        (20047, "Demo Cancelled Parent Not Available", false),
        (20016, "Demo Postponded", true),
        (20018, "DC Completed Need To Schedule", true),
        (20019, "Demo Scheduled", true),
        (20027, "Demo Completed FeedBack Pending", false),
        (DcDroppedCode, "DC Dropped", false),
        (20048, "No-Demo Taken/Sales Follow-up", false),
    };

    private static string? DemoStatusLabel(int? code) =>
        code.HasValue ? DemoStatuses.Where(s => s.Code == code.Value).Select(s => s.Label).FirstOrDefault() : null;

    private static bool IsCoordinator(IReadOnlyCollection<string> roles) =>
        roles.Any(r => string.Equals(r?.Trim(), "Coordinator", StringComparison.OrdinalIgnoreCase));

    public async Task<DemoStatusOptions> GetDemoStatusOptionsAsync(CancellationToken token)
    {
        var codes = await _repository.GetTypeCodesAsync(DemoStatuses.Select(s => s.Code).ToList(), null, token);
        var statuses = DemoStatuses
            .Select(s => (s, code: codes.FirstOrDefault(c => c.Value == s.Code)))
            .Where(x => x.code != null) // a status whose lookup is missing/inactive is not offered
            .Select(x => new DemoStatusOption(x.s.Code, x.code!.Id, x.s.Label, x.s.Reminder, x.s.Code == DcDroppedCode))
            .ToList();
        var reasons = await _repository.GetTypeCodesAsync(null, DropoutReasonGroupCode, token);
        return new DemoStatusOptions(statuses, reasons);
    }

    public async Task<MyCalendarResult<IReadOnlyList<MyCalendarFollowUpDto>>> GetFollowUpsAsync(
        Guid callerUserId, IReadOnlyCollection<string> callerRoles, int month, int year, CancellationToken token)
    {
        if (month < 1 || month > 12 || year < 2000 || year > 2100)
            return MyCalendarResult<IReadOnlyList<MyCalendarFollowUpDto>>.Fail(400, "Invalid month or year.");
        var rows = await _repository.GetFollowUpsAsync(callerUserId, callerRoles, month, year, token);
        var coordinator = IsCoordinator(callerRoles);
        foreach (var row in rows)
        {
            row.StatusName = DemoStatusLabel(row.StatusCode) ?? row.StatusName;
            row.CanUpdateStatus = coordinator && row.CoordinatorUserId == callerUserId;
        }
        return MyCalendarResult<IReadOnlyList<MyCalendarFollowUpDto>>.Ok(rows);
    }

    public async Task<MyCalendarResult<EnrollmentStatusState>> GetEnrollmentStatusAsync(
        Guid callerUserId, IReadOnlyCollection<string> callerRoles, Guid salesDetailsId, CancellationToken token)
    {
        var state = await _repository.GetEnrollmentStatusAsync(salesDetailsId, token);
        if (state == null) return MyCalendarResult<EnrollmentStatusState>.Fail(404, "Demo enrolment not found.");
        if (!IsCoordinator(callerRoles) || state.CoordinatorUserId != callerUserId)
            return MyCalendarResult<EnrollmentStatusState>.Fail(403, "Only the Coordinator of this enrolment can manage its demo status.");
        state.StatusName = DemoStatusLabel(state.StatusCode) ?? state.StatusName;
        return MyCalendarResult<EnrollmentStatusState>.Ok(state);
    }

    public async Task<MyCalendarResult<EnrollmentStatusState>> UpdateDemoStatusAsync(
        Guid callerUserId, IReadOnlyCollection<string> callerRoles, UpdateDemoStatusRequest request, CancellationToken token)
    {
        if (request.SalesDetailsId == Guid.Empty)
            return MyCalendarResult<EnrollmentStatusState>.Fail(400, "Demo enrolment is required.");
        if (!IsCoordinator(callerRoles))
            return MyCalendarResult<EnrollmentStatusState>.Fail(403, "Only Coordinators can update demo status.");

        var definition = DemoStatuses.FirstOrDefault(s => s.Code == request.StatusCode);
        if (definition.Label == null)
            return MyCalendarResult<EnrollmentStatusState>.Fail(400, "Please choose one of the listed demo statuses.");
        var status = (await _repository.GetTypeCodesAsync(new[] { request.StatusCode }, null, token)).FirstOrDefault();
        if (status == null)
            return MyCalendarResult<EnrollmentStatusState>.Fail(400, $"The status \"{definition.Label}\" is not available. Please contact the administrator.");

        DateTime? reminder = request.ReminderDate?.Date;
        if (definition.Reminder)
        {
            if (reminder == null)
                return MyCalendarResult<EnrollmentStatusState>.Fail(400, $"Please choose a Remind Me date for \"{definition.Label}\".");
            var today = DateTime.UtcNow.Date;
            if (reminder < today.AddYears(-1) || reminder > today.AddYears(1))
                return MyCalendarResult<EnrollmentStatusState>.Fail(400, "Please choose a Remind Me date within one year of today.");
        }
        else
        {
            // Statuses without a reminder never store one.
            reminder = null;
        }

        Guid? reasonId = null;
        if (request.StatusCode == DcDroppedCode)
        {
            if (request.DropoutReasonId == null || request.DropoutReasonId == Guid.Empty)
                return MyCalendarResult<EnrollmentStatusState>.Fail(400, "Please select a dropout reason for DC Dropped.");
            var reasons = await _repository.GetTypeCodesAsync(null, DropoutReasonGroupCode, token);
            if (!reasons.Any(r => r.Id == request.DropoutReasonId))
                return MyCalendarResult<EnrollmentStatusState>.Fail(400, "Please select one of the listed dropout reasons.");
            reasonId = request.DropoutReasonId;
        }

        var outcome = await _repository.UpdateDemoStatusAsync(request.SalesDetailsId, callerUserId, status.Id, reminder, reasonId, token);
        switch (outcome)
        {
            case DemoStatusUpdateOutcome.NotFound:
                return MyCalendarResult<EnrollmentStatusState>.Fail(404, "Demo enrolment not found.");
            case DemoStatusUpdateOutcome.NotOwner:
                return MyCalendarResult<EnrollmentStatusState>.Fail(403, "Only the Coordinator of this enrolment can update its demo status.");
        }

        var state = (await _repository.GetEnrollmentStatusAsync(request.SalesDetailsId, token))!;
        state.StatusName = DemoStatusLabel(state.StatusCode) ?? state.StatusName;
        return MyCalendarResult<EnrollmentStatusState>.Ok(state,
            outcome == DemoStatusUpdateOutcome.NoChange ? "No changes to save." : $"Demo status updated to \"{definition.Label}\".");
    }
}
