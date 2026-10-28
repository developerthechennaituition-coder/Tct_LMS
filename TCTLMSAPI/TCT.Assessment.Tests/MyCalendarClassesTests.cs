using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Services;

namespace TCT.Assessment.Tests;

// My Calendar regular classes (GET api/my-calendar/classes) at the service layer; the per-role scope
// (Sales.Ownership / SalesDetails.Coordinator) is in MyCalendarRepository.GetClassSchedulesAsync.
public class MyCalendarClassesTests
{
    private static readonly CancellationToken None = CancellationToken.None;

    [Fact] public async Task ClassesComeFromTheClassQueryWithTheCallersIdentityAndAreReadOnly()
    {
        var repo = Stub.For<IMyCalendarRepository>();
        var caller = Guid.NewGuid();
        string[] roles = { "Operations" };
        var row = new MyCalendarDemoDto { ScheduleDetailsId = Guid.NewGuid(), ScheduleType = "Class", TutorName = "Tutor on the schedule row", CanUpdateStatus = true };
        repo.Stub.Handlers["GetClassSchedulesAsync"] = args =>
        {
            Assert.Equal(caller, args[0]); Assert.Equal(roles, args[1]); Assert.Equal(10, args[2]); Assert.Equal(2026, args[3]);
            return Task.FromResult<IReadOnlyList<MyCalendarDemoDto>>(new[] { row });
        };

        var result = await new MyCalendarService(repo.Value).GetClassSchedulesAsync(caller, roles, 10, 2026, None);

        Assert.True(result.Succeeded);
        var only = Assert.Single(result.Data!);
        Assert.Equal("Tutor on the schedule row", only.TutorName);
        Assert.False(only.CanUpdateStatus);
    }

    [Theory]
    [InlineData("Coordinator")] [InlineData("CoordinatorAdmin")] [InlineData("SuperAdmin")] [InlineData("Admin")] [InlineData("Sales")]
    public async Task NonOperationsRolesGetNoClassesAndNoQueryRuns(string role)
    {
        var repo = Stub.For<IMyCalendarRepository>(); // no handler: any repository call would throw
        var result = await new MyCalendarService(repo.Value).GetClassSchedulesAsync(Guid.NewGuid(), new[] { role }, 10, 2026, None);
        Assert.True(result.Succeeded);
        Assert.Empty(result.Data!);
    }

    [Theory] [InlineData("Operations")] [InlineData("OperationsAdmin")]
    public async Task OnlyOperationsRolesReachTheClassQueryEvenWhenACoordinatorRoleIsAlsoHeld(string operationsRole)
    {
        var repo = Stub.For<IMyCalendarRepository>();
        IReadOnlyCollection<string>? passed = null;
        repo.Stub.Handlers["GetClassSchedulesAsync"] = args =>
        {
            passed = (IReadOnlyCollection<string>)args[1]!;
            return Task.FromResult<IReadOnlyList<MyCalendarDemoDto>>(Array.Empty<MyCalendarDemoDto>());
        };
        await new MyCalendarService(repo.Value).GetClassSchedulesAsync(Guid.NewGuid(), new[] { "Coordinator", operationsRole }, 10, 2026, None);
        Assert.Equal(new[] { operationsRole }, passed);
    }

    [Theory] [InlineData(0, 2026)] [InlineData(13, 2026)] [InlineData(10, 1999)]
    public async Task InvalidMonthOrYearIsRejectedWithoutQuerying(int month, int year)
    {
        var repo = Stub.For<IMyCalendarRepository>(); // no handler: any repository call would throw
        var result = await new MyCalendarService(repo.Value).GetClassSchedulesAsync(Guid.NewGuid(), new[] { "Coordinator" }, month, year, None);
        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact] public async Task DemosStillUseTheDemoQuery()
    {
        var repo = Stub.For<IMyCalendarRepository>();
        var called = false;
        repo.Stub.Handlers["GetDemoSchedulesAsync"] = _ => { called = true; return Task.FromResult<IReadOnlyList<MyCalendarDemoDto>>(Array.Empty<MyCalendarDemoDto>()); };
        var result = await new MyCalendarService(repo.Value).GetDemoSchedulesAsync(Guid.NewGuid(), new[] { "Coordinator" }, 10, 2026, None);
        Assert.True(result.Succeeded);
        Assert.True(called);
    }
}
