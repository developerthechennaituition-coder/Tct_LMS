using Rules = TCT.LMS.Application.Services.PaySlipAccessRules;
using Roles = TCT.LMS.Application.Services.ClassActionAuthorizationRules;

namespace TCT.Assessment.Tests;

public class PaySlipAccessRulesTests
{
    private static readonly Guid Tutor = Guid.NewGuid();
    private static readonly Guid OtherTutor = Guid.NewGuid();

    [Fact]
    public void TutorOpensOwnPaySlip() =>
        Assert.Null(Rules.Check(Roles.RestrictedAs(new[] { "Tutor" }), Tutor, Tutor));

    [Fact]
    public void TutorCannotOpenAnotherTutorsPaySlip() =>
        Assert.Equal(Rules.ForbiddenMessage, Rules.Check(Roles.RestrictedAs(new[] { "Tutor" }), Tutor, OtherTutor));

    [Fact]
    public void StudentCannotOpenAnyPaySlip() =>
        Assert.Equal(Rules.ForbiddenMessage, Rules.Check(Roles.RestrictedAs(new[] { "Student" }), Tutor, Tutor));

    [Theory]
    [InlineData("AccountsAdmin")]
    [InlineData("Accounts")]
    [InlineData("PayrollAdmin")]
    [InlineData("Payroll")]
    [InlineData("SuperAdmin")]
    [InlineData("Operations")]
    [InlineData("OperationsAdmin")]
    public void StaffKeepTheirAccess(string role) =>
        Assert.Null(Rules.Check(Roles.RestrictedAs(new[] { role }), Tutor, OtherTutor));

    [Fact]
    public void TutorWithoutCallerIdIsRefused() =>
        Assert.Equal(Rules.ForbiddenMessage, Rules.Check("tutor", Guid.Empty, OtherTutor));

    [Fact]
    public void UnknownPaySlipIsLeftToTheAction() =>
        Assert.Null(Rules.Check("tutor", Tutor, null));
}
