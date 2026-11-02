using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Application.Services;
using TCT.LMS.Domain.Entities;

namespace TCT.Assessment.Tests;

// My Calendar → Tasks: deadline time and the verification workflow at the service layer. The same permission and
// status rules are repeated in MyCalendarRepository's conditional updates.
public class MyCalendarTaskVerificationTests
{
    private static readonly CancellationToken None = CancellationToken.None;
    private static readonly Guid Assigner = Guid.NewGuid();
    private static readonly Guid Assignee = Guid.NewGuid();

    private static UserTaskDto Task(string verificationStatus, Guid? assignedBy = null, Guid? assignedTo = null) => new()
    {
        Id = Guid.NewGuid(),
        AssignedByUserId = assignedBy ?? Assigner,
        AssignedToUserId = assignedTo ?? Assignee,
        Status = verificationStatus is "Assigned" or "InProgress" ? UserTaskStatus.Pending : UserTaskStatus.Completed,
        VerificationStatus = verificationStatus,
    };

    // ─── Effective status (existing tasks have WorkflowStatus = null) ───

    [Theory]
    [InlineData("Pending", null, "Assigned")]
    [InlineData("Pending", "InProgress", "InProgress")]
    [InlineData("Completed", null, "Completed")]
    [InlineData("Completed", "InProgress", "Completed")]
    [InlineData("Completed", "PendingVerification", "PendingVerification")]
    [InlineData("Completed", "ChangesRequested", "ChangesRequested")]
    [InlineData("Completed", "Verified", "Verified")]
    public void EffectiveStatusKeepsTheMeaningOfTheExistingStatus(string status, string? workflow, string expected) =>
        Assert.Equal(expected, UserTaskWorkflowStatus.Effective(status, workflow));

    // ─── Permission flags ───

    [Theory]
    [InlineData("Assigned", true)]          // Complete → completion form → Pending Verification
    [InlineData("InProgress", true)]
    [InlineData("Completed", true)]         // completed before the workflow
    [InlineData("ChangesRequested", true)]  // resubmission
    [InlineData("PendingVerification", false)]
    [InlineData("Verified", false)]
    public async Task OnlyTheAssigneeMaySubmitAndNotWhileAwaitingVerificationOrVerified(string status, bool expected)
    {
        var repo = Stub.For<IMyCalendarRepository>();
        var task = Task(status);
        repo.Stub.Handlers["GetTasksForUserAsync"] = _ => System.Threading.Tasks.Task.FromResult<IReadOnlyList<UserTaskDto>>(new[] { task });

        var asAssignee = await new MyCalendarService(repo.Value).GetTasksAsync(Assignee, None);
        Assert.Equal(expected, asAssignee.Single().CanSubmitForVerification);
        Assert.False(asAssignee.Single().CanVerify);

        var asAssigner = await new MyCalendarService(repo.Value).GetTasksAsync(Assigner, None);
        Assert.False(asAssigner.Single().CanSubmitForVerification);
    }

    [Fact]
    public async Task SelfAssignedTasksCannotBeSubmittedOrVerified()
    {
        var repo = Stub.For<IMyCalendarRepository>();
        var completed = Task("Completed", Assignee, Assignee);
        var pending = Task("PendingVerification", Assignee, Assignee);
        repo.Stub.Handlers["GetTasksForUserAsync"] = _ => System.Threading.Tasks.Task.FromResult<IReadOnlyList<UserTaskDto>>(new[] { completed, pending });

        var tasks = await new MyCalendarService(repo.Value).GetTasksAsync(Assignee, None);

        Assert.All(tasks, t => Assert.False(t.CanSubmitForVerification));
        Assert.All(tasks, t => Assert.False(t.CanVerify));
    }

    [Fact]
    public async Task TheAssignerMayVerifyATaskAwaitingVerification()
    {
        var repo = Stub.For<IMyCalendarRepository>();
        var task = Task("PendingVerification");
        repo.Stub.Handlers["GetTasksForUserAsync"] = _ => System.Threading.Tasks.Task.FromResult<IReadOnlyList<UserTaskDto>>(new[] { task });

        Assert.True((await new MyCalendarService(repo.Value).GetTasksAsync(Assigner, None)).Single().CanVerify);
    }

    [Fact]
    public async Task PendingVerificationListIsScopedToTheAssignerAndNeverShowsTheCallersOwnTask()
    {
        var repo = Stub.For<IMyCalendarRepository>();
        Guid? scope = Guid.Empty;
        var own = Task("PendingVerification", Guid.NewGuid(), Assigner);
        var other = Task("PendingVerification");
        repo.Stub.Handlers["GetPendingVerificationTasksAsync"] = args =>
        {
            scope = (Guid?)args[0];
            return System.Threading.Tasks.Task.FromResult<IReadOnlyList<UserTaskDto>>(new[] { own, other });
        };

        var tasks = await new MyCalendarService(repo.Value).GetPendingVerificationTasksAsync(Assigner, new[] { "Coordinator" }, None);

        Assert.Equal(Assigner, scope);
        Assert.Equal(other.Id, Assert.Single(tasks).Id);
        Assert.True(tasks.Single().CanVerify);
    }

    [Theory] [InlineData("SuperAdmin")] [InlineData("Admin")]
    public async Task AdministratorsSeeEveryTaskAwaitingVerificationAndMayVerifyIt(string role)
    {
        var repo = Stub.For<IMyCalendarRepository>();
        Guid? scope = Guid.Empty;
        var admin = Guid.NewGuid();
        var task = Task("PendingVerification");
        repo.Stub.Handlers["GetPendingVerificationTasksAsync"] = args =>
        {
            scope = (Guid?)args[0];
            return System.Threading.Tasks.Task.FromResult<IReadOnlyList<UserTaskDto>>(new[] { task });
        };

        var tasks = await new MyCalendarService(repo.Value).GetPendingVerificationTasksAsync(admin, new[] { role }, None);

        Assert.Null(scope);
        Assert.True(Assert.Single(tasks).CanVerify);
    }

    // ─── Review ───

    [Theory] [InlineData(null)] [InlineData("")] [InlineData("   ")]
    public async Task RequestingChangesRequiresACommentAndDoesNotReachTheDatabase(string? comment)
    {
        var repo = Stub.For<IMyCalendarRepository>(); // no handler: any repository call would throw
        var result = await new MyCalendarService(repo.Value).ReviewTaskAsync(Assigner, new[] { "Coordinator" }, Guid.NewGuid(), false, comment, None);
        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Theory]
    [InlineData("Coordinator", false)]
    [InlineData("Operations", false)]
    [InlineData("SuperAdmin", true)]
    [InlineData("Admin", true)]
    public async Task ReviewPassesTheAdministratorFlagFromTheCallersRoles(string role, bool admin)
    {
        var repo = Stub.For<IMyCalendarRepository>();
        bool? passed = null;
        repo.Stub.Handlers["ReviewTaskAsync"] = args => { passed = (bool)args[2]!; return System.Threading.Tasks.Task.FromResult(TaskWorkflowOutcome.NotVerifier); };

        var result = await new MyCalendarService(repo.Value).ReviewTaskAsync(Guid.NewGuid(), new[] { role }, Guid.NewGuid(), true, null, None);

        Assert.Equal(admin, passed);
        Assert.Equal(403, result.StatusCode);
    }

    [Fact]
    public async Task AReviewOfATaskNoLongerAwaitingVerificationIsAConflict()
    {
        var repo = Stub.For<IMyCalendarRepository>();
        repo.Stub.Handlers["ReviewTaskAsync"] = _ => System.Threading.Tasks.Task.FromResult(TaskWorkflowOutcome.InvalidState);
        var result = await new MyCalendarService(repo.Value).ReviewTaskAsync(Assigner, new[] { "Coordinator" }, Guid.NewGuid(), true, null, None);
        Assert.Equal(409, result.StatusCode);
    }

    [Fact]
    public async Task ApprovalReturnsTheUpdatedTask()
    {
        var repo = Stub.For<IMyCalendarRepository>();
        var task = Task("Verified");
        repo.Stub.Handlers["ReviewTaskAsync"] = _ => System.Threading.Tasks.Task.FromResult(TaskWorkflowOutcome.Done);
        repo.Stub.Handlers["GetTaskAsync"] = _ => System.Threading.Tasks.Task.FromResult<UserTaskDto?>(task);

        var result = await new MyCalendarService(repo.Value).ReviewTaskAsync(Assigner, new[] { "Coordinator" }, task.Id, true, "Looks good", None);

        Assert.True(result.Succeeded);
        Assert.Equal("Verified", result.Data!.VerificationStatus);
        Assert.False(result.Data.CanVerify);
    }

    // ─── Submit ───

    private static TaskVerificationFile File(string name, long length) => new(name, length, new MemoryStream(new byte[1]));

    public static IEnumerable<object[]> InvalidUploads() => new[]
    {
        new object[] { new[] { File("a.exe", 10) } },
        new object[] { new[] { File("a.pdf", 0) } },
        new object[] { new[] { File("a.pdf", 11L * 1024 * 1024) } },
        new object[] { Enumerable.Range(0, 6).Select(i => File($"{i}.png", 10)).ToArray() },
        new object[] { Enumerable.Range(0, 3).Select(i => File($"{i}.png", 9L * 1024 * 1024)).ToArray() },
    };

    [Theory] [MemberData(nameof(InvalidUploads))]
    public async Task InvalidProofFilesAreRejectedBeforeAnythingIsStored(TaskVerificationFile[] files)
    {
        var repo = Stub.For<IMyCalendarRepository>(); // no handler: any repository call would throw
        var result = await new MyCalendarService(repo.Value).SubmitForVerificationAsync(Assignee, Guid.NewGuid(), "done", files, None);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task NotesAreTrimmedAndMissingNotesAreAllowed()
    {
        var repo = Stub.For<IMyCalendarRepository>();
        var notes = new List<string?>();
        repo.Stub.Handlers["SubmitForVerificationAsync"] = args => { notes.Add((string?)args[2]); return System.Threading.Tasks.Task.FromResult(TaskWorkflowOutcome.NotAssignee); };
        var service = new MyCalendarService(repo.Value);

        await service.SubmitForVerificationAsync(Assignee, Guid.NewGuid(), "  done  ", Array.Empty<TaskVerificationFile>(), None);
        var result = await service.SubmitForVerificationAsync(Assignee, Guid.NewGuid(), "   ", Array.Empty<TaskVerificationFile>(), None);

        Assert.Equal(new[] { "done", null }, notes);
        Assert.Equal(403, result.StatusCode);
    }

    [Fact]
    public async Task SubmittingASelfAssignedTaskIsRejected()
    {
        var repo = Stub.For<IMyCalendarRepository>();
        repo.Stub.Handlers["SubmitForVerificationAsync"] = _ => System.Threading.Tasks.Task.FromResult(TaskWorkflowOutcome.SelfAssigned);
        var result = await new MyCalendarService(repo.Value).SubmitForVerificationAsync(Assignee, Guid.NewGuid(), null, Array.Empty<TaskVerificationFile>(), None);
        Assert.Equal(400, result.StatusCode);
    }

    // ─── Deadline time ───

    private static readonly DateTime UtcNow = new(2026, 11, 2, 10, 0, 0);

    [Theory]
    [InlineData("2026-11-02T15:00:00", -330, true)]   // IST 15:00 = 09:30 UTC, already past
    [InlineData("2026-11-02T15:31:00", -330, false)]  // IST 15:31 = 10:01 UTC
    [InlineData("2026-11-02T05:00:00", 300, false)]   // UTC−5 05:00 = 10:00 UTC (now)
    [InlineData("2026-11-02T04:58:00", 300, true)]
    [InlineData("2026-11-01T22:30:00", null, false)]  // no offset: still today somewhere (UTC−12)
    [InlineData("2026-11-01T21:59:00", null, true)]
    [InlineData("2026-11-01T21:59:00", 5000, true)]   // an impossible offset is ignored
    public void DeadlineInThePastUsesTheBrowserOffsetWhenGiven(string localDeadline, int? offset, bool past) =>
        Assert.Equal(past, MyCalendarService.IsDeadlineInPast(DateTime.Parse(localDeadline), offset, UtcNow));

    private static (MyCalendarService Service, List<object?[]> Created) CreateHarness()
    {
        var repo = Stub.For<IMyCalendarRepository>();
        var created = new List<object?[]>();
        repo.Stub.Handlers["IsEligibleAssigneeAsync"] = _ => System.Threading.Tasks.Task.FromResult(true);
        repo.Stub.Handlers["CreateTaskAsync"] = args => { created.Add(args); return System.Threading.Tasks.Task.FromResult(Guid.NewGuid()); };
        repo.Stub.Handlers["GetTaskAsync"] = _ => System.Threading.Tasks.Task.FromResult<UserTaskDto?>(Task("Assigned"));
        return (new MyCalendarService(repo.Value), created);
    }

    [Fact]
    public async Task ATaskWithoutADueTimeIsCreatedDateOnlyAsBefore()
    {
        var (service, created) = CreateHarness();
        var request = new CreateUserTaskRequest(Assignee, "Call", "Call the parent", DateTime.UtcNow.Date.AddDays(1), null);

        var result = await service.CreateTaskAsync(Assigner, request, None);

        Assert.True(result.Succeeded);
        Assert.Null(created.Single()[5]);
    }

    [Fact]
    public async Task TheDueTimeIsStoredToTheMinute()
    {
        var (service, created) = CreateHarness();
        var request = new CreateUserTaskRequest(Assignee, "Call", "Call the parent", DateTime.UtcNow.Date.AddDays(2), "High", "17:30", -330);

        var result = await service.CreateTaskAsync(Assigner, request, None);

        Assert.True(result.Succeeded);
        Assert.Equal(new TimeSpan(17, 30, 0), created.Single()[5]);
    }

    [Theory] [InlineData("25:00")] [InlineData("abc")] [InlineData("12:60")]
    public async Task AnInvalidDueTimeIsRejected(string dueTime)
    {
        var (service, created) = CreateHarness();
        var request = new CreateUserTaskRequest(Assignee, "Call", "Call the parent", DateTime.UtcNow.Date.AddDays(1), null, dueTime, 0);

        var result = await service.CreateTaskAsync(Assigner, request, None);

        Assert.Equal(400, result.StatusCode);
        Assert.Empty(created);
    }

    [Fact]
    public async Task ADeadlineEarlierThanNowIsRejected()
    {
        var (service, created) = CreateHarness();
        var earlier = DateTime.UtcNow.AddHours(-2);
        var request = new CreateUserTaskRequest(Assignee, "Call", "Call the parent", earlier.Date, null, earlier.ToString("HH:mm"), 0);

        var result = await service.CreateTaskAsync(Assigner, request, None);

        // Also when "two hours ago" was yesterday: the existing date rule allows yesterday, the deadline check does not.
        Assert.Equal(400, result.StatusCode);
        Assert.Empty(created);
    }
}
