using Microsoft.Extensions.Logging.Abstractions;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Application.Services;
using TCT.LMS.Domain;
using TCT.LMS.DTOs.Sales;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.Assessment.Tests;

public class TutorAssignmentSaveTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task AssignmentAwaitsNotificationsAndPreservesPaymentApproval(bool paymentApproval)
    {
        var repo = Stub.For<ISalesRepository>();
        var notifications = Stub.For<INotificationService>();
        var approvalId = Guid.NewGuid();
        var saved = new Response<SalesDetailsUpdateResponsDto>
        {
            Succeeded = true,
            Data = new SalesDetailsUpdateResponsDto { TutorPaymentApprovalId = paymentApproval ? approvalId : null }
        };
        repo.Stub.Handlers["UpdateSalesDetailsStatus"] = _ => Task.FromResult(saved);
        var gate = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        var calls = new List<string>();
        notifications.Stub.Handlers["AddNotifications"] = _ => { calls.Add("assignment"); return gate.Task; };
        notifications.Stub.Handlers["AddTutorPaymentApprovalNotification"] = args =>
        {
            Assert.Equal(approvalId, args[0]); calls.Add("payment"); return Task.CompletedTask;
        };
        var service = new SalesService(repo.Value, notifications.Value, null!, null!, null!, null!, null!, null!, null!, NullLogger<SalesService>.Instance);
        var saving = service.UpdateSalesDetailsStatus(new UpdateSalesDetailsDTO
        {
            Status = (int)FollowUpStatus.DemoPendingTutorAssignedNotApproved
        });
        Assert.False(saving.IsCompleted);
        Assert.Equal(new[] { "assignment" }, calls);
        gate.SetResult(true);
        Assert.Same(saved, await saving.WaitAsync(TimeSpan.FromSeconds(5)));
        Assert.Equal(paymentApproval ? new[] { "assignment", "payment" } : new[] { "assignment" }, calls);
    }

    [Fact]
    public async Task FailedPersistenceDoesNotNotifyAnyone()
    {
        var repo = Stub.For<ISalesRepository>();
        var notifications = Stub.For<INotificationService>(); // Any unexpected call throws.
        repo.Stub.Handlers["UpdateSalesDetailsStatus"] = _ => Task.FromResult(new Response<SalesDetailsUpdateResponsDto> { Succeeded = false });
        var service = new SalesService(repo.Value, notifications.Value, null!, null!, null!, null!, null!, null!, null!, NullLogger<SalesService>.Instance);
        var result = await service.UpdateSalesDetailsStatus(new UpdateSalesDetailsDTO { Status = (int)FollowUpStatus.DemoPendingTutorAssignedNotApproved });
        Assert.False(result.Succeeded);
    }
}
