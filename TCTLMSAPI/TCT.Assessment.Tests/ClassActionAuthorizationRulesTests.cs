using Rules = TCT.LMS.Application.Services.ClassActionAuthorizationRules;

namespace TCT.Assessment.Tests;

public class ClassActionAuthorizationRulesTests
{
    private static readonly Guid Caller = Guid.NewGuid();
    private static readonly Guid Other = Guid.NewGuid();
    private static string[] R(params string[] roles) => roles;

    [Theory]
    [InlineData("tutor")]
    [InlineData("TUTOR")]
    [InlineData("")]
    [InlineData(null)]
    public void TutorMayCancelOrRescheduleOwnClassAsThemselves(string? guestType)
    {
        Assert.Null(Rules.Check(R("Tutor"), guestType, Caller, Caller, ownsClass: true));
        Assert.Null(Rules.Check(R("Tutor"), guestType, null, Caller, ownsClass: true));
    }

    [Fact]
    public void TutorCannotTouchAnotherTutorsClass() =>
        Assert.Equal(Rules.ForbiddenMessage, Rules.Check(R("Tutor"), "tutor", Caller, Caller, ownsClass: false));

    [Fact]
    public void StudentCannotTouchAnotherStudentsClass() =>
        Assert.Equal(Rules.ForbiddenMessage, Rules.Check(R("Student"), "student", Caller, Caller, ownsClass: false));

    [Theory]
    [InlineData("Tutor", "operation")]     // posting as Operations would skip the tutor's cancellation allowance
    [InlineData("Tutor", "student")]
    [InlineData("Student", "tutor")]
    [InlineData("Student", "operation")]
    [InlineData("Tutor", "superadmin")]
    public void TutorsAndStudentsCannotUseAnotherEntryType(string role, string guestType) =>
        Assert.Equal(Rules.ForbiddenMessage, Rules.Check(R(role), guestType, Caller, Caller, ownsClass: true));

    [Theory]
    [InlineData("Tutor")]
    [InlineData("Student")]
    public void TutorsAndStudentsCannotActAsAnotherUser(string role) =>
        Assert.Equal(Rules.ForbiddenMessage, Rules.Check(R(role), role.ToLowerInvariant(), Other, Caller, ownsClass: true));

    [Fact]
    public void MissingCallerIsRefused() =>
        Assert.Equal(Rules.ForbiddenMessage, Rules.Check(R("Tutor"), "tutor", null, Guid.Empty, ownsClass: true));

    [Theory]
    [InlineData("Operations", "operation")]
    [InlineData("OperationsAdmin", "operation")]
    [InlineData("SuperAdmin", "superadmin")]
    [InlineData("Coordinator", "coordinator")]
    [InlineData("CoordinatorAdmin", "coordinatoradmin")]
    [InlineData("AccountsAdmin", null)]
    public void StaffKeepTheirExistingAccess(string role, string? guestType)
    {
        Assert.Null(Rules.RestrictedAs(R(role)));
        Assert.Null(Rules.Check(R(role), guestType, Other, Caller, ownsClass: false));
    }

    [Fact]
    public void ATutorWhoIsAlsoStaffIsTreatedAsStaff() =>
        Assert.Null(Rules.Check(R("Tutor", "Operations"), "operation", Other, Caller, ownsClass: false));

    [Theory]
    [InlineData(1009002, true)]   // Class Cancelled
    [InlineData(1009003, true)]   // Cancelled Student Not Available
    [InlineData(1009004, true)]   // Request for Re-schedule
    [InlineData(1009006, true)]   // Class Re-Scheduled
    [InlineData(20021, true)]
    [InlineData(20023, true)]
    [InlineData(1009001, false)]  // Class Completed: not affected
    [InlineData(1009008, false)]  // Extra Class: not affected
    [InlineData(null, false)]
    public void OnlyCancelAndRescheduleStatusesAreChecked(int? code, bool expected) =>
        Assert.Equal(expected, Rules.IsCancelOrReschedule(code));
}
