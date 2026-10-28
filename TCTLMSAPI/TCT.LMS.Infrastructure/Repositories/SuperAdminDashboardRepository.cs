using System.Data;
using System.Data.Common;
using Microsoft.EntityFrameworkCore;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Data.Common;

namespace TCT.LMS.Infrastructure.Repositories;

public sealed class SuperAdminDashboardRepository : ISuperAdminDashboardRepository
{
    private readonly ApplicationDbContext _dbContext;
    public SuperAdminDashboardRepository(ApplicationDbContext dbContext) => _dbContext = dbContext;

    public Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> QueryAsync(
        SuperAdminDashboardQuery query, DateTime fromDate, DateTime toDate, int take, CancellationToken token)
        => ExecuteAsync(Sql(query), fromDate, toDate, take, token);

    private static string Sql(SuperAdminDashboardQuery query) => query switch
    {
        SuperAdminDashboardQuery.Summary => @"
SELECT
 (SELECT COUNT(DISTINCT st.BoardId) FROM dbo.Student st JOIN dbo.[User] u ON u.Id=st.UserId
   WHERE st.IsActive=1 AND ISNULL(u.IsActive,0)=1 AND st.BoardId IS NOT NULL) TotalBoards,
 (SELECT COUNT_BIG(*) FROM dbo.Student st JOIN dbo.[User] u ON u.Id=st.UserId
   WHERE st.IsActive=1 AND ISNULL(u.IsActive,0)=1) ActiveStudents,
 (SELECT COUNT_BIG(*) FROM dbo.Tutor t JOIN dbo.[User] u ON u.Id=t.UserId
   WHERE t.IsActive=1 AND ISNULL(u.IsActive,0)=1) ActiveTutors,
 (SELECT CAST(100.0*SUM(CASE WHEN d.Status=N'Class Completed' THEN 1 ELSE 0 END)/NULLIF(COUNT_BIG(*),0) AS decimal(5,2))
   FROM dbo.ScheduleDetails d JOIN dbo.Schedule s ON s.ScheduleId=d.ScheduleId
   WHERE d.IsActive=1 AND ISNULL(s.IsActive,0)=1 AND d.[Date]>=@FromDate AND d.[Date]<DATEADD(day,1,@ToDate)) CompletionRate,
 (SELECT CAST(100.0*SUM(CASE WHEN d.Status=N'Class Completed' THEN 1 ELSE 0 END)/NULLIF(COUNT_BIG(*),0) AS decimal(5,2))
   FROM dbo.ScheduleDetails d JOIN dbo.Schedule s ON s.ScheduleId=d.ScheduleId
   WHERE d.IsActive=1 AND ISNULL(s.IsActive,0)=1 AND d.[Date]>=@FromDate AND d.[Date]<DATEADD(day,1,@ToDate)) AttendanceRate;",

        SuperAdminDashboardQuery.Boards => @"
SELECT TOP (@Take) st.BoardId,board.TypeCodeName BoardName,COUNT(DISTINCT st.Id) ActiveStudents,
 COUNT(DISTINCT sd.SubjectId) SubjectCount
FROM dbo.Student st JOIN dbo.[User] u ON u.Id=st.UserId
LEFT JOIN dbo.Type_Code board ON board.Id=st.BoardId
LEFT JOIN dbo.Sales s ON s.StudentId=st.Id AND s.IsActive=1
LEFT JOIN dbo.SalesDetails sd ON sd.SalesId=s.Id AND sd.IsActive=1
WHERE st.IsActive=1 AND ISNULL(u.IsActive,0)=1 AND st.BoardId IS NOT NULL
GROUP BY st.BoardId,board.TypeCodeName ORDER BY ActiveStudents DESC,BoardName;",

        SuperAdminDashboardQuery.ActiveStudents => @"
SELECT TOP (@Take) st.Id StudentId,st.Code StudentCode,COALESCE(u.FullName,CONCAT(u.FirstName,N' ',u.LastName)) StudentName,
 board.TypeCodeName BoardName,grade.TypeCodeName GradeName,u.Email,u.Phone
FROM dbo.Student st JOIN dbo.[User] u ON u.Id=st.UserId
LEFT JOIN dbo.Type_Code board ON board.Id=st.BoardId LEFT JOIN dbo.Type_Code grade ON grade.Id=st.GradeId
WHERE st.IsActive=1 AND ISNULL(u.IsActive,0)=1 ORDER BY StudentName;",

        SuperAdminDashboardQuery.ActiveTutors => @"
SELECT TOP (@Take) t.Id TutorId,u.UserCode,COALESCE(u.FullName,CONCAT(u.FirstName,N' ',u.LastName)) TutorName,
 u.JoiningDate,u.Email,u.Phone,COUNT(DISTINCT CASE WHEN a.IsActive=1 THEN a.StudentId END) ActiveStudents
FROM dbo.Tutor t JOIN dbo.[User] u ON u.Id=t.UserId
LEFT JOIN dbo.TutorStudentAllocations a ON a.TutorId=t.Id
WHERE t.IsActive=1 AND ISNULL(u.IsActive,0)=1
GROUP BY t.Id,u.UserCode,u.FullName,u.FirstName,u.LastName,u.JoiningDate,u.Email,u.Phone ORDER BY TutorName;",

        SuperAdminDashboardQuery.CourseCompletion => @"
SELECT board.TypeCodeName BoardName,sub.TypeCodeName SubjectName,COUNT_BIG(*) ScheduledClasses,
 SUM(CASE WHEN d.Status=N'Class Completed' THEN CONVERT(bigint,1) ELSE 0 END) CompletedClasses,
 CAST(100.0*SUM(CASE WHEN d.Status=N'Class Completed' THEN 1 ELSE 0 END)/NULLIF(COUNT_BIG(*),0) AS decimal(5,2)) CompletionRate
FROM dbo.ScheduleDetails d JOIN dbo.Schedule s ON s.ScheduleId=d.ScheduleId
JOIN dbo.Student st ON st.Id=s.StudentId LEFT JOIN dbo.Type_Code board ON board.Id=st.BoardId
LEFT JOIN dbo.SalesDetails course ON course.Id=s.SalesDetailsId LEFT JOIN dbo.Type_Code sub ON sub.Id=course.SubjectId
WHERE d.IsActive=1 AND ISNULL(s.IsActive,0)=1 AND d.[Date]>=@FromDate AND d.[Date]<DATEADD(day,1,@ToDate)
GROUP BY board.TypeCodeName,sub.TypeCodeName ORDER BY BoardName,SubjectName;",

        SuperAdminDashboardQuery.Attendance => @"
SELECT CAST(d.[Date] AS date) AttendanceDate,COUNT_BIG(*) ScheduledClasses,
 SUM(CASE WHEN d.Status=N'Class Completed' THEN CONVERT(bigint,1) ELSE 0 END) AttendedClasses,
 CAST(100.0*SUM(CASE WHEN d.Status=N'Class Completed' THEN 1 ELSE 0 END)/NULLIF(COUNT_BIG(*),0) AS decimal(5,2)) AttendanceRate
FROM dbo.ScheduleDetails d JOIN dbo.Schedule s ON s.ScheduleId=d.ScheduleId
WHERE d.IsActive=1 AND ISNULL(s.IsActive,0)=1 AND d.[Date]>=@FromDate AND d.[Date]<DATEADD(day,1,@ToDate)
GROUP BY CAST(d.[Date] AS date) ORDER BY AttendanceDate;",

        SuperAdminDashboardQuery.ResourceUtilization => @"
SELECT TOP (@Take) board.TypeCodeName BoardName,grade.TypeCodeName GradeName,sub.TypeCodeName SubjectName,
 COUNT(DISTINCT a.TutorId) UtilizedTutors,COUNT(DISTINCT a.StudentId) AlignedStudents,
 COUNT(DISTINCT CASE WHEN d.Status=N'Class Completed' THEN d.ScheduleDetailsId END) CompletedClasses
FROM dbo.TutorStudentAllocations a
JOIN dbo.Student st ON st.Id=a.StudentId LEFT JOIN dbo.Type_Code board ON board.Id=st.BoardId
LEFT JOIN dbo.Type_Code grade ON grade.Id=st.GradeId LEFT JOIN dbo.SalesDetails allocationCourse ON allocationCourse.Id=a.SalesDetailsId LEFT JOIN dbo.Type_Code sub ON sub.Id=allocationCourse.SubjectId
LEFT JOIN dbo.Schedule s ON s.StudentId=a.StudentId AND s.TutorId=a.TutorId AND s.SalesDetailsId=a.SalesDetailsId AND s.IsActive=1
LEFT JOIN dbo.ScheduleDetails d ON d.ScheduleId=s.ScheduleId AND d.IsActive=1 AND d.[Date]>=@FromDate AND d.[Date]<DATEADD(day,1,@ToDate)
WHERE a.IsActive=1 GROUP BY board.TypeCodeName,grade.TypeCodeName,sub.TypeCodeName
ORDER BY AlignedStudents DESC,BoardName,GradeName,SubjectName;",

        SuperAdminDashboardQuery.LatestUsers => @"
SELECT TOP (@Take) u.Id UserId,u.UserCode,COALESCE(u.FullName,CONCAT(u.FirstName,N' ',u.LastName)) UserName,
 r.RoleName,u.Email,u.Phone,u.CreatedDate,u.IsActive
FROM dbo.[User] u LEFT JOIN dbo.UserRole ur ON ur.UserId=u.Id LEFT JOIN dbo.Roles r ON r.Id=ur.RoleId
WHERE u.CreatedDate>=@FromDate AND u.CreatedDate<DATEADD(day,1,@ToDate)
ORDER BY u.CreatedDate DESC;",
        _ => throw new ArgumentOutOfRangeException(nameof(query), query, null)
    };

    private async Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> ExecuteAsync(
        string sql, DateTime fromDate, DateTime toDate, int take, CancellationToken token)
    {
        DbConnection connection = _dbContext.Database.GetDbConnection();
        var openedHere = connection.State != ConnectionState.Open;
        if (openedHere) await connection.OpenAsync(token);
        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = sql;
            command.CommandTimeout = 30;
            if (sql.Contains("@FromDate", StringComparison.Ordinal)) Add(command, "@FromDate", DbType.Date, fromDate);
            if (sql.Contains("@ToDate", StringComparison.Ordinal)) Add(command, "@ToDate", DbType.Date, toDate);
            if (sql.Contains("@Take", StringComparison.Ordinal)) Add(command, "@Take", DbType.Int32, take);
            var rows = new List<IReadOnlyDictionary<string, object?>>();
            await using var reader = await command.ExecuteReaderAsync(token);
            while (await reader.ReadAsync(token))
            {
                var row = new Dictionary<string, object?>(reader.FieldCount, StringComparer.OrdinalIgnoreCase);
                for (var i = 0; i < reader.FieldCount; i++)
                    row[reader.GetName(i)] = await reader.IsDBNullAsync(i, token) ? null : reader.GetValue(i);
                rows.Add(row);
            }
            return rows;
        }
        finally { if (openedHere) await connection.CloseAsync(); }
    }

    private static void Add(DbCommand command, string name, DbType type, object value)
    {
        var parameter = command.CreateParameter();
        parameter.ParameterName = name; parameter.DbType = type; parameter.Value = value;
        command.Parameters.Add(parameter);
    }
}

