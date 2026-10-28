using System.Data;
using System.Data.Common;
using Microsoft.EntityFrameworkCore;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Data.Common;

namespace TCT.LMS.Infrastructure.Repositories;

public sealed class CoordinatorDashboardRepository : ICoordinatorDashboardRepository
{
    private readonly ApplicationDbContext _dbContext;
    public CoordinatorDashboardRepository(ApplicationDbContext dbContext) => _dbContext=dbContext;
    public Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> QueryAsync(CoordinatorDashboardQuery query, Guid coordinatorId, DateTime fromDate, DateTime toDate, int take, CancellationToken token) => ExecuteAsync(Sql(query),coordinatorId,fromDate,toDate,take,token);

    private static string Sql(CoordinatorDashboardQuery query) => query switch
    {
        CoordinatorDashboardQuery.Summary => @"
SELECT COUNT(DISTINCT sd.Id) TotalInflow,COUNT(DISTINCT s.StudentId) TotalStudents,COUNT(DISTINCT sd.SubjectId) Courses,
 SUM(CASE WHEN tc.TypeCodeName LIKE N'%Drop%' OR tc.TypeCodeName LIKE N'%Cancel%' THEN CONVERT(bigint,1) ELSE 0 END) Dropped,
 SUM(CASE WHEN tc.TypeCodeValue IN (20001,20002,20012,20013) THEN CONVERT(bigint,1) ELSE 0 END) PendingDemos,
 SUM(CASE WHEN tc.TypeCodeValue=20003 THEN CONVERT(bigint,1) ELSE 0 END) DemoScheduled,
 COUNT(DISTINCT CASE WHEN sch.ScheduleId IS NOT NULL THEN sd.Id END) Converted,
 CAST(100.0*COUNT(DISTINCT CASE WHEN sch.ScheduleId IS NOT NULL THEN sd.Id END)/NULLIF(COUNT(DISTINCT sd.Id),0) AS decimal(5,2)) SuccessRate,
 -- Today (India Standard Time; demo times are stored in IST), independent of the From / To dates:
 -- the coordinator's active demo sessions held today, and those of them whose outcome is completed
 -- (20041 Demo Completed, or the completion step's 'Demo Completed Need to Schedule' / 'Class Completed').
 (SELECT COUNT(DISTINCT d.ScheduleDetailsId) FROM dbo.ScheduleDetails d JOIN dbo.Schedule ds ON ds.ScheduleId=d.ScheduleId
   JOIN dbo.SalesDetails dsd ON dsd.Id=ds.SalesDetailsId
   WHERE d.IsActive=1 AND ds.IsActive=1 AND d.ScheduleType='Demo' AND dsd.Coordinator=@CoordinatorId AND dsd.IsActive=1
     AND CAST(d.StartTime AS date)=CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'India Standard Time' AS date)) TodayScheduledDemos,
 (SELECT COUNT(DISTINCT d.ScheduleDetailsId) FROM dbo.ScheduleDetails d JOIN dbo.Schedule ds ON ds.ScheduleId=d.ScheduleId
   JOIN dbo.SalesDetails dsd ON dsd.Id=ds.SalesDetailsId
   WHERE d.IsActive=1 AND ds.IsActive=1 AND d.ScheduleType='Demo' AND dsd.Coordinator=@CoordinatorId AND dsd.IsActive=1
     AND CAST(d.StartTime AS date)=CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'India Standard Time' AS date)
     AND (d.Status IN (N'Demo Completed Need to Schedule',N'Class Completed')
       OR EXISTS(SELECT 1 FROM dbo.Type_Code oc WHERE oc.TypeCodeValue=20041
                   AND oc.Id IN (d.OperationScheduleStatus,d.TutorScheduleStatus,d.StudentScheduleStatus)))) TodayCompletedDemos
FROM dbo.SalesDetails sd JOIN dbo.Sales s ON s.Id=sd.SalesId LEFT JOIN dbo.Type_Code tc ON tc.Id=sd.Status
LEFT JOIN dbo.Schedule sch ON sch.StudentId=s.StudentId AND sch.SalesDetailsId=sd.Id AND sch.IsActive=1
WHERE sd.Coordinator=@CoordinatorId AND sd.IsActive=1 AND s.IsActive=1 AND s.CreatedDate>=@FromDate AND s.CreatedDate<DATEADD(day,1,@ToDate);",
        CoordinatorDashboardQuery.Courses => @"
SELECT TOP (@Take) sd.SubjectId,sub.TypeCodeName SubjectName,board.TypeCodeName BoardName,grade.TypeCodeName GradeName,
 COUNT(DISTINCT s.StudentId) Students,COUNT(DISTINCT sd.TutorId) Tutors
FROM dbo.SalesDetails sd JOIN dbo.Sales s ON s.Id=sd.SalesId LEFT JOIN dbo.Type_Code sub ON sub.Id=sd.SubjectId
LEFT JOIN dbo.Type_Code board ON board.Id=s.BoardId LEFT JOIN dbo.Type_Code grade ON grade.Id=s.GradeId
WHERE sd.Coordinator=@CoordinatorId AND sd.IsActive=1 AND s.IsActive=1
GROUP BY sd.SubjectId,sub.TypeCodeName,board.TypeCodeName,grade.TypeCodeName ORDER BY Students DESC;",
        CoordinatorDashboardQuery.Students => @"
SELECT TOP (@Take) st.Id StudentId,st.Code StudentCode,COALESCE(u.FullName,CONCAT(u.FirstName,N' ',u.LastName)) StudentName,
 board.TypeCodeName BoardName,grade.TypeCodeName GradeName,COUNT(DISTINCT sd.SubjectId) Subjects,u.IsActive
FROM dbo.SalesDetails sd JOIN dbo.Sales s ON s.Id=sd.SalesId JOIN dbo.Student st ON st.Id=s.StudentId JOIN dbo.[User] u ON u.Id=st.UserId
LEFT JOIN dbo.Type_Code board ON board.Id=st.BoardId LEFT JOIN dbo.Type_Code grade ON grade.Id=st.GradeId
WHERE sd.Coordinator=@CoordinatorId AND sd.IsActive=1 AND s.IsActive=1
GROUP BY st.Id,st.Code,u.FullName,u.FirstName,u.LastName,board.TypeCodeName,grade.TypeCodeName,u.IsActive ORDER BY StudentName;",
        CoordinatorDashboardQuery.DemoPipeline => @"
SELECT tc.TypeCodeValue StatusCode,tc.TypeCodeName StatusName,COUNT_BIG(*) DemoCount
FROM dbo.SalesDetails sd JOIN dbo.Sales s ON s.Id=sd.SalesId LEFT JOIN dbo.Type_Code tc ON tc.Id=sd.Status
WHERE sd.Coordinator=@CoordinatorId AND sd.IsActive=1 AND s.IsActive=1 AND s.CreatedDate>=@FromDate AND s.CreatedDate<DATEADD(day,1,@ToDate)
GROUP BY tc.TypeCodeValue,tc.TypeCodeName ORDER BY DemoCount DESC;",
        CoordinatorDashboardQuery.DemoConversions => @"
SELECT board.TypeCodeName BoardName,COUNT(DISTINCT sd.Id) DemoRequests,
 COUNT(DISTINCT CASE WHEN sch.ScheduleId IS NOT NULL THEN sd.Id END) Converted,
 CAST(100.0*COUNT(DISTINCT CASE WHEN sch.ScheduleId IS NOT NULL THEN sd.Id END)/NULLIF(COUNT(DISTINCT sd.Id),0) AS decimal(5,2)) ConversionRate
FROM dbo.SalesDetails sd JOIN dbo.Sales s ON s.Id=sd.SalesId LEFT JOIN dbo.Type_Code board ON board.Id=s.BoardId
LEFT JOIN dbo.Schedule sch ON sch.StudentId=s.StudentId AND sch.SalesDetailsId=sd.Id AND sch.IsActive=1
WHERE sd.Coordinator=@CoordinatorId AND sd.IsActive=1 AND s.IsActive=1 AND s.CreatedDate>=@FromDate AND s.CreatedDate<DATEADD(day,1,@ToDate)
GROUP BY board.TypeCodeName ORDER BY ConversionRate DESC;",
        CoordinatorDashboardQuery.TutorWorkload => @"
SELECT TOP (@Take) t.Id TutorId,COALESCE(u.FullName,CONCAT(u.FirstName,N' ',u.LastName)) TutorName,
 COUNT(DISTINCT s.StudentId) Students,COUNT(DISTINCT sd.SubjectId) Subjects,
 CAST(AVG(CONVERT(decimal(10,2),r.Rating)) AS decimal(5,2)) AverageRating,
 CASE WHEN COUNT(DISTINCT s.StudentId)<=5 THEN N'Low' ELSE N'High' END Engagement
FROM dbo.SalesDetails sd JOIN dbo.Sales s ON s.Id=sd.SalesId JOIN dbo.Tutor t ON t.UserId=sd.TutorId JOIN dbo.[User] u ON u.Id=t.UserId
LEFT JOIN dbo.UserClassRating r ON r.RatedUserId=u.Id
WHERE sd.Coordinator=@CoordinatorId AND sd.IsActive=1 AND s.IsActive=1
GROUP BY t.Id,u.FullName,u.FirstName,u.LastName ORDER BY Students DESC,TutorName;",
        CoordinatorDashboardQuery.ClassProgress => @"
SELECT DATEFROMPARTS(YEAR(d.[Date]),MONTH(d.[Date]),1) ReportMonth,COUNT_BIG(*) Scheduled,
 SUM(CASE WHEN d.Status=N'Class Completed' THEN CONVERT(bigint,1) ELSE 0 END) Completed,
 CAST(100.0*SUM(CASE WHEN d.Status=N'Class Completed' THEN 1 ELSE 0 END)/NULLIF(COUNT_BIG(*),0) AS decimal(5,2)) CompletionRate
FROM dbo.ScheduleDetails d JOIN dbo.Schedule sch ON sch.ScheduleId=d.ScheduleId
WHERE d.IsActive=1 AND sch.IsActive=1 AND d.[Date]>=@FromDate AND d.[Date]<DATEADD(day,1,@ToDate)
 AND EXISTS(SELECT 1 FROM dbo.SalesDetails sd JOIN dbo.Sales s ON s.Id=sd.SalesId WHERE sd.Coordinator=@CoordinatorId AND sd.IsActive=1 AND s.StudentId=sch.StudentId AND sd.Id=sch.SalesDetailsId)
GROUP BY DATEFROMPARTS(YEAR(d.[Date]),MONTH(d.[Date]),1) ORDER BY ReportMonth;",
        CoordinatorDashboardQuery.Alerts => @"
SELECT TOP (@Take) sd.Id SalesDetailsId,COALESCE(u.FullName,CONCAT(u.FirstName,N' ',u.LastName)) StudentName,
 sub.TypeCodeName SubjectName,tc.TypeCodeName AlertStatus,sd.FollowUpDate,
 CASE WHEN sd.FollowUpDate<GETDATE() THEN N'Overdue follow-up' WHEN sd.TutorId IS NULL THEN N'Tutor assignment pending' ELSE N'Pending approval' END AlertType
FROM dbo.SalesDetails sd JOIN dbo.Sales s ON s.Id=sd.SalesId JOIN dbo.Student st ON st.Id=s.StudentId JOIN dbo.[User] u ON u.Id=st.UserId
LEFT JOIN dbo.Type_Code sub ON sub.Id=sd.SubjectId LEFT JOIN dbo.Type_Code tc ON tc.Id=sd.Status
WHERE sd.Coordinator=@CoordinatorId AND sd.IsActive=1 AND s.IsActive=1 AND (tc.TypeCodeValue IN (20001,20002,20012,20013) OR sd.FollowUpDate<GETDATE())
ORDER BY sd.FollowUpDate,StudentName;",
        // One row per inflow record, with the same filters as Summary, so the dashboard cards can list the records they count.
        CoordinatorDashboardQuery.InflowDetails => @"
SELECT TOP (@Take) sd.Id SalesDetailsId,s.StudentId,st.UserId StudentUserId,st.Code StudentCode,
 COALESCE(u.FullName,CONCAT(u.FirstName,N' ',u.LastName)) StudentName,sd.SubjectId,sub.TypeCodeName SubjectName,
 board.TypeCodeName BoardName,grade.TypeCodeName GradeName,tc.TypeCodeValue StatusCode,tc.TypeCodeName StatusName,
 COALESCE(tu.FullName,CONCAT(tu.FirstName,N' ',tu.LastName)) TutorName,s.CreatedDate,sd.FollowUpDate,
 CAST(CASE WHEN EXISTS(SELECT 1 FROM dbo.Schedule sch WHERE sch.StudentId=s.StudentId AND sch.SalesDetailsId=sd.Id AND sch.IsActive=1) THEN 1 ELSE 0 END AS bit) IsConverted
FROM dbo.SalesDetails sd JOIN dbo.Sales s ON s.Id=sd.SalesId LEFT JOIN dbo.Type_Code tc ON tc.Id=sd.Status
LEFT JOIN dbo.Student st ON st.Id=s.StudentId LEFT JOIN dbo.[User] u ON u.Id=st.UserId
LEFT JOIN dbo.Type_Code sub ON sub.Id=sd.SubjectId LEFT JOIN dbo.Type_Code board ON board.Id=s.BoardId
LEFT JOIN dbo.Type_Code grade ON grade.Id=s.GradeId LEFT JOIN dbo.[User] tu ON tu.Id=sd.TutorId
WHERE sd.Coordinator=@CoordinatorId AND sd.IsActive=1 AND s.IsActive=1 AND s.CreatedDate>=@FromDate AND s.CreatedDate<DATEADD(day,1,@ToDate)
ORDER BY s.CreatedDate DESC,StudentName;",
        _ => throw new ArgumentOutOfRangeException(nameof(query),query,null)
    };

    private async Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> ExecuteAsync(string sql, Guid coordinatorId, DateTime fromDate, DateTime toDate, int take, CancellationToken token)
    {
        DbConnection connection=_dbContext.Database.GetDbConnection(); var opened=connection.State!=ConnectionState.Open; if(opened) await connection.OpenAsync(token);
        try { await using var command=connection.CreateCommand(); command.CommandText=sql; command.CommandTimeout=30;
            Add(command,"@CoordinatorId",DbType.Guid,coordinatorId); if(sql.Contains("@FromDate")) Add(command,"@FromDate",DbType.Date,fromDate); if(sql.Contains("@ToDate")) Add(command,"@ToDate",DbType.Date,toDate); if(sql.Contains("@Take")) Add(command,"@Take",DbType.Int32,take);
            var rows=new List<IReadOnlyDictionary<string,object?>>(); await using var reader=await command.ExecuteReaderAsync(token);
            while(await reader.ReadAsync(token)){var row=new Dictionary<string,object?>(reader.FieldCount,StringComparer.OrdinalIgnoreCase); for(var i=0;i<reader.FieldCount;i++) row[reader.GetName(i)]=await reader.IsDBNullAsync(i,token)?null:reader.GetValue(i); rows.Add(row);} return rows;
        } finally {if(opened) await connection.CloseAsync();}
    }
    private static void Add(DbCommand c,string n,DbType t,object v){var p=c.CreateParameter();p.ParameterName=n;p.DbType=t;p.Value=v;c.Parameters.Add(p);}
}

