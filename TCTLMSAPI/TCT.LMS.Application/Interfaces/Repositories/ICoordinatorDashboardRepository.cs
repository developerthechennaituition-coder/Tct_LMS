namespace TCT.LMS.Application.Interfaces.Repositories;

public enum CoordinatorDashboardQuery
{
    Summary, Courses, Students, DemoPipeline, DemoConversions,
    TutorWorkload, ClassProgress, Alerts, InflowDetails
}

public interface ICoordinatorDashboardRepository
{
    Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> QueryAsync(
        CoordinatorDashboardQuery query, Guid coordinatorId, DateTime fromDate,
        DateTime toDate, int take, CancellationToken token);
}
