using TCT.LMS.Domain;

namespace TCT.LMS.Application.Services;

/// <summary>
/// Keeps the tutor assignment decision with the Coordinator Admin (SalesController.UpdateSalesDetailsStatus) and holds
/// demo scheduling until that decision (SchedulerController.ScheduleEvent / Saveschedule). The Super Admin payment
/// decision is unchanged (TutorPaymentApprovalRules, TutorController.DecidePaymentApproval).
/// </summary>
public static class TutorAssignmentApprovalRules
{
    public const string NotCoordinatorAdminMessage =
        "Only a Coordinator Admin can approve or reject a tutor assignment.";

    public const string DemoBeforeApprovalMessage =
        "A demo can be scheduled only after the tutor assignment has been approved by the Coordinator Admin.";

    // Not assigned (20001), assigned and awaiting approval (20002 / 20012, also while a payment change awaits the
    // Super Admin) or rejected (20014). Every later status (demo scheduled, re-demo, rescheduled demo, ...) is unchanged.
    private static readonly int[] DemoBlockedStatusCodes =
    {
        (int)FollowUpStatus.DemoPendingTutorNotAssigned,
        (int)FollowUpStatus.DemoPendingTutorAssigned,
        (int)FollowUpStatus.DemoPendingTutorAssignedNotApproved,
        (int)FollowUpStatus.Reject
    };

    // Approve (20013) and reject (20014) are the Coordinator Admin decision. The repository branches on the posted
    // Status code but saves the posted StatusId, so the code behind StatusId is checked as well.
    public static bool IsAssignmentDecision(int status, int? statusIdCode) =>
        IsDecisionCode(status) || (statusIdCode.HasValue && IsDecisionCode(statusIdCode.Value));

    // An enrollment that cannot be found (null) is blocked as well.
    public static bool BlocksDemoScheduling(int? currentStatusCode) =>
        !currentStatusCode.HasValue || DemoBlockedStatusCodes.Contains(currentStatusCode.Value);

    private static bool IsDecisionCode(int code) =>
        code == (int)FollowUpStatus.DemoPendingTutorAssignedApproved || code == (int)FollowUpStatus.Reject;

    public const string TutorNotApprovedMessage =
        "The selected tutor is not the approved tutor for this enrollment. Please schedule the demo with the approved tutor.";

    public const string ScheduleStatusNotAllowedMessage =
        "Scheduling cannot set this enrollment status. Tutor assignment, approval and rejection are done in the tutor assignment flow.";

    // Assigning, approving and rejecting a tutor belong to the assignment flow only.
    private static readonly int[] AssignmentStatusCodes =
    {
        (int)FollowUpStatus.DemoPendingTutorNotAssigned,
        (int)FollowUpStatus.DemoPendingTutorAssigned,
        (int)FollowUpStatus.DemoPendingTutorAssignedNotApproved,
        (int)FollowUpStatus.DemoPendingTutorAssignedApproved,
        (int)FollowUpStatus.Reject
    };

    // Statuses only a demo booking sets; a class setting them would open the demo gate without a demo.
    private static readonly int[] DemoScheduleStatusCodes =
    {
        (int)FollowUpStatus.DemoScheduled,
        (int)FollowUpStatus.ReScheduledDemo
    };

    // AddOrUpdateSchedule receives the schedule type as its name ("Demo") or its code (100502).
    public static bool IsDemoScheduleType(string? scheduleType) =>
        string.Equals(scheduleType?.Trim(), ScheduleType.Demo.ToString(), StringComparison.OrdinalIgnoreCase)
        || (int.TryParse(scheduleType, out var code) && code == (int)ScheduleType.Demo);

    // AddOrUpdateSchedule saves the posted StatusCode on the enrollment as is.
    public static bool IsScheduleStatusAllowed(bool isDemo, int? statusCode) =>
        !statusCode.HasValue
        || (!AssignmentStatusCodes.Contains(statusCode.Value)
            && (isDemo || !DemoScheduleStatusCodes.Contains(statusCode.Value)));

    // The enrollment holds the approved Tutor id; screens send either that id or the tutor's User id.
    public static bool IsApprovedTutor(Guid? requestedTutorId, Guid? approvedTutorId, Guid? approvedTutorUserId) =>
        requestedTutorId.HasValue && requestedTutorId.Value != Guid.Empty
        && (requestedTutorId == approvedTutorId || requestedTutorId == approvedTutorUserId);
}
