using Microsoft.Extensions.Logging.Abstractions;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Application.Services;
using TCT.LMS.Domain;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Sales;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.Assessment.Tests;

public class TutorPaymentApprovalRulesTests
{
    private static readonly Guid Board = Guid.NewGuid(), Grade = Guid.NewGuid(), Subject = Guid.NewGuid();

    private static PaymentPercentageConfiguration Config(int tutorPercentage, bool active, DateTime created, DateTime? modified = null,
        Guid? subject = null) => new()
    {
        Id = Guid.NewGuid(), Board = Board, Grade = Grade, Subject = subject ?? Subject,
        TutorPercentage = tutorPercentage, TCTPercentage = 100 - tutorPercentage,
        IsActive = active, CreatedDate = created, ModifiedDate = modified,
    };

    private static PaymentPercentageConfiguration? Current(params PaymentPercentageConfiguration[] rows) =>
        TutorPaymentApprovalRules.CurrentConfiguration(rows.AsQueryable(), Board, Grade, Subject).FirstOrDefault();

    // ─── Fix A: payment percentage configuration ────────────────────────────────

    [Fact]
    public void InactiveConfigurationIsIgnored()
    {
        var day = new DateTime(2026, 10, 1);
        Assert.Null(Current(Config(30, active: false, day)));
        Assert.Equal(25, Current(Config(30, active: false, day.AddDays(5)), Config(25, active: true, day))!.TutorPercentage);
    }

    [Fact]
    public void LatestActiveDuplicateWinsUsingModifiedDateThenCreatedDate()
    {
        var day = new DateTime(2026, 10, 1);
        // Newest by CreatedDate wins when nothing was modified.
        Assert.Equal(40, Current(Config(30, true, day), Config(40, true, day.AddDays(2)))!.TutorPercentage);
        // A later ModifiedDate (e.g. re-activated) outranks a newer CreatedDate.
        Assert.Equal(30, Current(Config(30, true, day, modified: day.AddDays(3)), Config(40, true, day.AddDays(2)))!.TutorPercentage);
    }

    [Fact]
    public void OtherBoardGradeSubjectCombinationsAreNotUsed()
    {
        var day = new DateTime(2026, 10, 1);
        Assert.Null(Current(Config(30, true, day, subject: Guid.NewGuid())));
    }

    [Fact]
    public void DefaultTutorPaymentStillUsesTheConfiguredPercentage()
    {
        // Regression: the calculation itself is unchanged (Parent Payment × Tutor % ÷ 100).
        var service = new PaymentPercentageService(null!);
        Assert.Equal(300m, service.CalculateTutorShare(1000m, 30));
        Assert.Equal(333.33m, service.CalculateTutorShare(1111.10m, 30));
    }

    // ─── Fix B: Coordinator Admin decision vs pending Super Admin payment request ──

    private static TutorPaymentApproval Request(Guid salesDetailsId, Guid tutorId, int status, bool active) => new()
    {
        Id = Guid.NewGuid(), SalesDetailsId = salesDetailsId, TutorId = tutorId, ApprovalStatus = status, IsActive = active,
        Grade = "", Board = "",
    };

    [Fact]
    public void OnlyAnActivePendingRequestForTheCourseAndTutorIsAPendingSuperAdminRequest()
    {
        Guid course = Guid.NewGuid(), tutor = Guid.NewGuid();
        var isPending = TutorPaymentApprovalRules.IsPendingSuperAdminRequest(course, tutor).Compile();
        Assert.True(isPending(Request(course, tutor, (int)TutorPaymentStatus.Pending, active: true)));
        Assert.False(isPending(Request(course, tutor, (int)TutorPaymentStatus.Pending, active: false)));   // superseded / decided
        Assert.False(isPending(Request(course, tutor, (int)TutorPaymentStatus.Approved, active: true)));
        Assert.False(isPending(Request(course, tutor, (int)TutorPaymentStatus.Rejected, active: true)));
        Assert.False(isPending(Request(Guid.NewGuid(), tutor, (int)TutorPaymentStatus.Pending, active: true)));
        Assert.False(isPending(Request(course, Guid.NewGuid(), (int)TutorPaymentStatus.Pending, active: true)));
    }

    [Theory]
    [InlineData((int)FollowUpStatus.DemoPendingTutorAssignedApproved, true, true)]
    [InlineData((int)FollowUpStatus.Reject, true, true)]
    [InlineData((int)FollowUpStatus.DemoPendingTutorAssignedApproved, false, false)] // ordinary assignment: unchanged
    [InlineData((int)FollowUpStatus.Reject, false, false)]
    [InlineData((int)FollowUpStatus.DemoPendingTutorAssignedNotApproved, true, false)] // coordinator re-assignment path untouched
    [InlineData((int)FollowUpStatus.DemoPendingTutorAssigned, true, false)]
    public void CoordinatorAdminApproveAndRejectWaitOnlyForAPendingSuperAdminRequest(int status, bool pending, bool blocked) =>
        Assert.Equal(blocked, TutorPaymentApprovalRules.BlocksCoordinatorAdminDecision(status, pending));

    [Theory]
    [InlineData((int)FollowUpStatus.DemoPendingTutorAssignedApproved)]
    [InlineData((int)FollowUpStatus.Reject)]
    public async Task BlockedDecisionAddsNoNoteNotificationOrChatGroup(int status)
    {
        // Notes, chat group and status repositories are null and every notification call throws,
        // so any side effect of a blocked (unsaved) decision fails the test.
        var repo = Stub.For<ISalesRepository>();
        var notifications = Stub.For<INotificationService>();
        repo.Stub.Handlers["UpdateSalesDetailsStatus"] = _ => Task.FromResult(new Response<SalesDetailsUpdateResponsDto>
        {
            Succeeded = false, Message = TutorPaymentApprovalRules.PendingSuperAdminPaymentMessage,
        });
        var service = new SalesService(repo.Value, notifications.Value, null!, null!, null!, null!, null!, null!, null!, NullLogger<SalesService>.Instance);
        var result = await service.UpdateSalesDetailsStatus(new UpdateSalesDetailsDTO { Status = status, NoteText = "Approved by Coordinator Admin" });
        Assert.False(result.Succeeded);
        Assert.Equal(TutorPaymentApprovalRules.PendingSuperAdminPaymentMessage, result.Message);
    }
}
