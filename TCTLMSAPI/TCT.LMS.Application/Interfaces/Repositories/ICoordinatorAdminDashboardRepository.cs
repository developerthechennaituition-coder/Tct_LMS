namespace TCT.LMS.Application.Interfaces.Repositories;
public enum CoordinatorAdminDashboardQuery { Summary, Coordinators, PendingApprovals, DemoPipeline }
public interface ICoordinatorAdminDashboardRepository
{
    Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> QueryAsync(CoordinatorAdminDashboardQuery query, DateTime fromDate, DateTime toDate, int take, CancellationToken token);
}
