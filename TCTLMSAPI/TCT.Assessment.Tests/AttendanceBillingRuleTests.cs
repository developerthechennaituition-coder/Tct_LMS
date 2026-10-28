using TCT.LMS.Application.Services;

namespace TCT.Assessment.Tests;

public class AttendanceBillingRuleTests
{
    private const string Completed = "Class Completed";
    private const string CancelledStudentNa = "Class Cancelled Student Not Available";
    private static readonly string[] NotTakingPlaceNames = { "Class Cancelled", CancelledStudentNa, "Class Postponed" };

    // Tutor recorded 10 classes, Operations 12: the two extra classes are Operations-completed only.
    [Fact] public void OpsApprovedBillsOperationsRecordAndPaysTutorRecord()
    {
        var tutorTen = Enumerable.Repeat(true, 10).Concat(new[] { false, false });
        var classes = tutorTen.Select(tutorDone => (tutorDone, ops: Completed)).ToList();
        Assert.Equal(12, classes.Count(c => AttendanceBillingRule.IsParentBillable(AttendanceBillingRule.OpsApproved, c.tutorDone, c.ops)));
        Assert.Equal(10, classes.Count(c => AttendanceBillingRule.IsTutorPayable(AttendanceBillingRule.OpsApproved, c.tutorDone, c.ops)));
    }

    // Same 10-vs-12 month: "Go with operation attendance" -> both 12; "Go with tutors attendance" -> both 10.
    [Fact] public void GoWithChoiceGivesParentAndTutorTheSameCount()
    {
        var tutorTen = Enumerable.Repeat(true, 10).Concat(new[] { false, false });
        var classes = tutorTen.Select(tutorDone => (tutorDone, ops: Completed)).ToList();
        Assert.Equal(12, classes.Count(c => AttendanceBillingRule.IsParentBillable(AttendanceBillingRule.GoWithOperationAttendance, c.tutorDone, c.ops)));
        Assert.Equal(12, classes.Count(c => AttendanceBillingRule.IsTutorPayable(AttendanceBillingRule.GoWithOperationAttendance, c.tutorDone, c.ops)));
        Assert.Equal(10, classes.Count(c => AttendanceBillingRule.IsParentBillable(AttendanceBillingRule.GoWithTutorAttendance, c.tutorDone, c.ops)));
        Assert.Equal(10, classes.Count(c => AttendanceBillingRule.IsTutorPayable(AttendanceBillingRule.GoWithTutorAttendance, c.tutorDone, c.ops)));
    }

    // Records agree (tutor 10, Operations 10), cross-checked as Ops Approved: both 10.
    [Fact] public void OpsApprovedWhenRecordsAgreeGivesBothTheSameCount()
    {
        var classes = Enumerable.Repeat((tutorDone: true, ops: Completed), 10).ToList();
        Assert.Equal(10, classes.Count(c => AttendanceBillingRule.IsParentBillable(AttendanceBillingRule.OpsApproved, c.tutorDone, c.ops)));
        Assert.Equal(10, classes.Count(c => AttendanceBillingRule.IsTutorPayable(AttendanceBillingRule.OpsApproved, c.tutorDone, c.ops)));
    }

    [Theory]
    // crossCheck, tutorCompleted, opsStatus, parentBilled, tutorPaid
    [InlineData(AttendanceBillingRule.OpsApproved, true, null, true, true)]          // Ops agreed without their own record
    [InlineData(AttendanceBillingRule.OpsApproved, false, Completed, true, false)]    // the 12-vs-10 class
    [InlineData(AttendanceBillingRule.OpsApproved, true, CancelledStudentNa, false, true)]
    [InlineData(AttendanceBillingRule.GoWithTutorAttendance, false, Completed, false, false)]
    [InlineData(AttendanceBillingRule.GoWithTutorAttendance, true, CancelledStudentNa, true, true)]
    [InlineData(AttendanceBillingRule.GoWithOperationAttendance, false, Completed, true, true)]   // the 12-vs-10 class
    [InlineData(AttendanceBillingRule.GoWithOperationAttendance, true, null, false, false)]
    [InlineData(AttendanceBillingRule.GoWithOperationAttendance, true, "Class Completed (Extra Class)", true, true)]
    [InlineData(AttendanceBillingRule.GoWithOperationAttendance, true, CancelledStudentNa, false, false)]
    [InlineData(null, true, Completed, false, false)]                                // not cross-checked yet
    public void CrossCheckChoiceDecidesWhichRecordIsUsed(int? crossCheck, bool tutorCompleted, string? ops, bool parent, bool tutor)
    {
        Assert.Equal(parent, AttendanceBillingRule.IsParentBillable(crossCheck, tutorCompleted, ops));
        Assert.Equal(tutor, AttendanceBillingRule.IsTutorPayable(crossCheck, tutorCompleted, ops));
    }

    [Fact] public void OperationsRecordDecidesWhetherClassTookPlaceElseTutors()
    {
        Assert.True(AttendanceBillingRule.IsNotTakingPlace(CancelledStudentNa, NotTakingPlaceNames, 1009001));
        Assert.False(AttendanceBillingRule.IsNotTakingPlace(Completed, NotTakingPlaceNames, 1009002));
        Assert.True(AttendanceBillingRule.IsNotTakingPlace(null, NotTakingPlaceNames, 1009002));
        Assert.False(AttendanceBillingRule.IsNotTakingPlace(null, NotTakingPlaceNames, null));
    }

    [Fact] public void OnlyUnreviewedClassesThatTakePlaceBlockTheParentInvoice()
    {
        Assert.True(AttendanceBillingRule.IsAwaitingCrossCheck(null, notTakingPlace: false));
        Assert.True(AttendanceBillingRule.IsAwaitingCrossCheck(1009001, notTakingPlace: false)); // Operations' class status, not a cross-check
        Assert.False(AttendanceBillingRule.IsAwaitingCrossCheck(null, notTakingPlace: true));
        Assert.False(AttendanceBillingRule.IsAwaitingCrossCheck(AttendanceBillingRule.GoWithTutorAttendance, notTakingPlace: false));
    }
}
