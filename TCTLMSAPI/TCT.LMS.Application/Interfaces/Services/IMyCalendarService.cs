using TCT.LMS.Application.Interfaces.Repositories;

namespace TCT.LMS.Application.Interfaces.Services;

/// <summary>A demo status offered on My Calendar: display label, stored code/id, and what the form must ask for.</summary>
public sealed record DemoStatusOption(int Code, Guid Id, string Label, bool RequiresReminderDate, bool RequiresDropoutReason);

public sealed record DemoStatusOptions(IReadOnlyList<DemoStatusOption> Statuses, IReadOnlyList<TypeCodeOption> DropoutReasons);

public sealed record UpdateDemoStatusRequest(Guid SalesDetailsId, int StatusCode, DateTime? ReminderDate, Guid? DropoutReasonId);

public sealed record CreateUserTaskRequest(Guid AssignedToUserId, string? Title, string? Description, DateTime? DueDate, string? Priority);

/// <summary>Result of a My Calendar task action: Ok, or a client error (400/403/404/409) with a message.</summary>
public sealed record MyCalendarResult<T>(bool Succeeded, int StatusCode, string? Message, T? Data)
{
    public static MyCalendarResult<T> Ok(T data, string? message = null) => new(true, 200, message, data);
    public static MyCalendarResult<T> Fail(int statusCode, string message) => new(false, statusCode, message, default);
}

public interface IMyCalendarService
{
    /// <summary>Roles that may not use My Calendar or receive tasks (Tutor, Student).</summary>
    IReadOnlyCollection<string> ExcludedRoles { get; }

    /// <summary>True when at least one of the caller's roles is an eligible (non-Tutor/Student) role.</summary>
    bool IsEligible(IReadOnlyCollection<string> callerRoles);

    Task<MyCalendarResult<IReadOnlyList<MyCalendarDemoDto>>> GetDemoSchedulesAsync(Guid callerUserId, IReadOnlyCollection<string> callerRoles, int month, int year, CancellationToken token);

    Task<MyCalendarResult<IReadOnlyList<MyCalendarDemoDto>>> GetClassSchedulesAsync(Guid callerUserId, IReadOnlyCollection<string> callerRoles, int month, int year, CancellationToken token);

    Task<IReadOnlyList<TaskAssigneeDto>> GetTaskAssigneesAsync(CancellationToken token);

    Task<IReadOnlyList<UserTaskDto>> GetTasksAsync(Guid callerUserId, CancellationToken token);

    Task<MyCalendarResult<UserTaskDto>> CreateTaskAsync(Guid callerUserId, CreateUserTaskRequest request, CancellationToken token);

    Task<MyCalendarResult<UserTaskDto>> CompleteTaskAsync(Guid callerUserId, Guid taskId, CancellationToken token);

    // ─── Demo status workflow ───
    Task<DemoStatusOptions> GetDemoStatusOptionsAsync(CancellationToken token);

    Task<MyCalendarResult<IReadOnlyList<MyCalendarFollowUpDto>>> GetFollowUpsAsync(Guid callerUserId, IReadOnlyCollection<string> callerRoles, int month, int year, CancellationToken token);

    /// <summary>The enrolment's current status, reminder date and dropout reason — for its own Coordinator only.</summary>
    Task<MyCalendarResult<EnrollmentStatusState>> GetEnrollmentStatusAsync(Guid callerUserId, IReadOnlyCollection<string> callerRoles, Guid salesDetailsId, CancellationToken token);

    Task<MyCalendarResult<EnrollmentStatusState>> UpdateDemoStatusAsync(Guid callerUserId, IReadOnlyCollection<string> callerRoles, UpdateDemoStatusRequest request, CancellationToken token);
}
