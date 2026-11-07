using TCT.LMS.Application.Services;
using TCT.LMS.Domain;

namespace TCT.Assessment.Tests;

public class TutorAssignmentApprovalRulesTests
{
    [Theory]
    [InlineData((int)FollowUpStatus.DemoPendingTutorAssignedApproved, null, true)]
    [InlineData((int)FollowUpStatus.Reject, null, true)]
    [InlineData((int)FollowUpStatus.DemoPendingTutorAssignedNotApproved, null, false)] // assignment, not a decision
    [InlineData((int)FollowUpStatus.DemoPendingTutorAssigned, null, false)]
    [InlineData((int)FollowUpStatus.ShortFollowUp, null, false)]
    // The repository branches on Status but saves StatusId: an approve StatusId behind an assignment Status is a decision.
    [InlineData((int)FollowUpStatus.DemoPendingTutorAssignedNotApproved, (int)FollowUpStatus.DemoPendingTutorAssignedApproved, true)]
    [InlineData((int)FollowUpStatus.DemoPendingTutorAssignedNotApproved, (int)FollowUpStatus.Reject, true)]
    [InlineData((int)FollowUpStatus.DemoPendingTutorAssignedNotApproved, (int)FollowUpStatus.DemoPendingTutorAssignedNotApproved, false)]
    public void IsAssignmentDecision(int status, int? statusIdCode, bool expected) =>
        Assert.Equal(expected, TutorAssignmentApprovalRules.IsAssignmentDecision(status, statusIdCode));

    [Theory]
    [InlineData((int)FollowUpStatus.DemoPendingTutorNotAssigned)]
    [InlineData((int)FollowUpStatus.DemoPendingTutorAssigned)]
    [InlineData((int)FollowUpStatus.DemoPendingTutorAssignedNotApproved)]
    [InlineData((int)FollowUpStatus.Reject)]
    [InlineData(null)] // enrollment not found
    public void DemoSchedulingIsBlockedBeforeApproval(int? currentStatusCode) =>
        Assert.True(TutorAssignmentApprovalRules.BlocksDemoScheduling(currentStatusCode));

    [Theory]
    [InlineData((int)FollowUpStatus.DemoPendingTutorAssignedApproved)]
    [InlineData((int)FollowUpStatus.DemoScheduled)]   // reschedule of an existing demo
    [InlineData((int)FollowUpStatus.ReDemo)]
    [InlineData((int)FollowUpStatus.ReScheduledDemo)]
    [InlineData((int)FollowUpStatus.DemoCompleted)]
    public void DemoSchedulingIsAllowedAfterApproval(int currentStatusCode) =>
        Assert.False(TutorAssignmentApprovalRules.BlocksDemoScheduling(currentStatusCode));

    [Theory]
    [InlineData("Demo", true)]
    [InlineData(" demo ", true)]
    [InlineData("100502", true)]
    [InlineData("Class", false)]
    [InlineData("100501", false)]
    [InlineData(null, false)]
    public void IsDemoScheduleType(string? scheduleType, bool expected) =>
        Assert.Equal(expected, TutorAssignmentApprovalRules.IsDemoScheduleType(scheduleType));

    // AddOrUpdateSchedule: no caller may assign, approve or reject through the schedule's StatusCode.
    [Theory]
    [InlineData(true, (int)FollowUpStatus.DemoPendingTutorAssignedApproved)]
    [InlineData(false, (int)FollowUpStatus.DemoPendingTutorAssignedApproved)]
    [InlineData(true, (int)FollowUpStatus.Reject)]
    [InlineData(false, (int)FollowUpStatus.DemoPendingTutorAssignedNotApproved)]
    [InlineData(false, (int)FollowUpStatus.DemoPendingTutorNotAssigned)]
    [InlineData(false, (int)FollowUpStatus.DemoPendingTutorAssigned)]
    // A class may not set a demo status, which would open the demo gate without a demo.
    [InlineData(false, (int)FollowUpStatus.DemoScheduled)]
    [InlineData(false, (int)FollowUpStatus.ReScheduledDemo)]
    public void ScheduleStatusIsRejected(bool isDemo, int statusCode) =>
        Assert.False(TutorAssignmentApprovalRules.IsScheduleStatusAllowed(isDemo, statusCode));

    [Theory]
    [InlineData(true, (int)FollowUpStatus.DemoScheduled)]   // what the demo screen sends
    [InlineData(false, (int)FollowUpStatus.Schedule)]       // what the class screen sends
    [InlineData(false, null)]                               // class screen without a status
    [InlineData(true, null)]
    public void ScheduleStatusIsAllowed(bool isDemo, int? statusCode) =>
        Assert.True(TutorAssignmentApprovalRules.IsScheduleStatusAllowed(isDemo, statusCode));

    private static readonly Guid ApprovedTutorId = Guid.NewGuid();
    private static readonly Guid ApprovedTutorUserId = Guid.NewGuid();

    [Fact]
    public void ApprovedTutorMatchesTutorIdOrUserId()
    {
        Assert.True(TutorAssignmentApprovalRules.IsApprovedTutor(ApprovedTutorId, ApprovedTutorId, ApprovedTutorUserId));
        Assert.True(TutorAssignmentApprovalRules.IsApprovedTutor(ApprovedTutorUserId, ApprovedTutorId, ApprovedTutorUserId));
    }

    [Fact]
    public void OtherOrMissingTutorIsRejected()
    {
        Assert.False(TutorAssignmentApprovalRules.IsApprovedTutor(Guid.NewGuid(), ApprovedTutorId, ApprovedTutorUserId));
        Assert.False(TutorAssignmentApprovalRules.IsApprovedTutor(null, ApprovedTutorId, ApprovedTutorUserId));
        Assert.False(TutorAssignmentApprovalRules.IsApprovedTutor(Guid.Empty, ApprovedTutorId, ApprovedTutorUserId));
        Assert.False(TutorAssignmentApprovalRules.IsApprovedTutor(Guid.NewGuid(), null, null)); // no approved tutor
    }
}
