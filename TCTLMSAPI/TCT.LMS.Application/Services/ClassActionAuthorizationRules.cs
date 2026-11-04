namespace TCT.LMS.Application.Services;

/// <summary>
/// Who may cancel or re-schedule a class (SchedulerController: status saves with a cancel / re-schedule status, the
/// Reschedule Class flow's new class, and moving a class's time). Used by ClassActionAuthorizationFilter.
/// A Tutor or Student (who is not also staff) may do it only as themselves (the request's UserId is the caller), only
/// with their own entry type ("tutor" / "student", or none), and only on a class of their own course. Staff roles keep
/// their existing access. Other statuses and other requests are not affected.
/// </summary>
public static class ClassActionAuthorizationRules
{
    public const string ForbiddenMessage = "You can only cancel or re-schedule your own classes.";

    // Class Cancelled, Cancelled Student Not Available, Request for Re-schedule, Class Re-Scheduled, Class Canceled
    // Tutor Not Available, and the follow-up Class Re-Scheduled / Request for Re-schedule codes.
    public static readonly int[] CancelOrRescheduleStatusCodes = { 1009002, 1009003, 1009004, 1009006, 20021, 20023, 20024 };

    public static bool IsCancelOrReschedule(int? statusCode) => statusCode.HasValue && CancelOrRescheduleStatusCodes.Contains(statusCode.Value);

    private static readonly string[] StaffRoles =
    {
        "Operations", "OperationsAdmin", "OperationAdmin", "SuperAdmin", "Admin", "Coordinator", "CoordinatorAdmin",
        "Accounts", "AccountsAdmin", "Payroll", "PayrollAdmin", "SalesAdmin", "HR", "HRAdmin"
    };

    private static bool Has(IReadOnlyCollection<string> roles, string role) => roles.Contains(role, StringComparer.OrdinalIgnoreCase);

    // The caller's own entry type when the rule applies ("tutor" / "student"); null for staff (not restricted).
    public static string? RestrictedAs(IReadOnlyCollection<string> roles) =>
        roles.Any(r => StaffRoles.Contains(r, StringComparer.OrdinalIgnoreCase)) ? null
        : Has(roles, "Tutor") ? "tutor"
        : Has(roles, "Student") ? "student"
        : null;

    /// <param name="roles">The caller's roles (JWT).</param>
    /// <param name="guestType">The request's entry type; null / empty when the request has none.</param>
    /// <param name="requestUserId">The UserId the request acts as (null / empty when it has none).</param>
    /// <param name="ownsClass">The class (or course) is the caller's own, as the tutor or the student.</param>
    /// <returns>Null when allowed, otherwise the reason.</returns>
    public static string? Check(IReadOnlyCollection<string> roles, string? guestType, Guid? requestUserId, Guid callerId, bool ownsClass)
    {
        var restricted = RestrictedAs(roles);
        if (restricted == null) return null;
        if (callerId == Guid.Empty) return ForbiddenMessage;
        var guest = guestType?.Trim().ToLowerInvariant();
        if (!string.IsNullOrEmpty(guest) && guest != restricted) return ForbiddenMessage;   // e.g. a tutor posting as "operation"
        if (requestUserId is { } acting && acting != Guid.Empty && acting != callerId) return ForbiddenMessage;
        return ownsClass ? null : ForbiddenMessage;
    }
}
