namespace TCT.LMS.Application.Interfaces.Repositories;

public enum SuperAdminDashboardQuery
{
    Summary,
    Boards,
    ActiveStudents,
    ActiveTutors,
    CourseCompletion,
    Attendance,
    ResourceUtilization,
    LatestUsers
}

public interface ISuperAdminDashboardRepository
{
    Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> QueryAsync(
        SuperAdminDashboardQuery query,
        DateTime fromDate,
        DateTime toDate,
        int take,
        CancellationToken token);
}
