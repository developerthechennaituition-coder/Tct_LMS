using System.Data;
using System.Data.Common;
using Microsoft.EntityFrameworkCore;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Data.Common;

namespace TCT.LMS.Infrastructure.Repositories;

public sealed class OperationsDashboardRepository : IOperationsDashboardRepository
{
    private readonly ApplicationDbContext _dbContext;

    public OperationsDashboardRepository(ApplicationDbContext dbContext) => _dbContext = dbContext;

    public Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> QueryAsync(
        OperationsDashboardQuery query,
        DateTime reportDate,
        DateTime fromDate,
        DateTime toDate,
        int take,
        CancellationToken token)
        => ExecuteAsync(Sql(query), reportDate, fromDate, toDate, take, token);

    private static string Sql(OperationsDashboardQuery query) => query switch
    {
        OperationsDashboardQuery.Summary => @"
SELECT
 (SELECT COUNT_BIG(*) FROM dbo.ScheduleDetails d JOIN dbo.Schedule s ON s.ScheduleId=d.ScheduleId
  WHERE d.IsActive=1 AND ISNULL(s.IsActive,0)=1
   AND d.[Date]>=@ReportDate AND d.[Date]<DATEADD(day,1,@ReportDate)) TodayPlannedClasses,
 (SELECT COUNT_BIG(*) FROM dbo.ScheduleDetails d JOIN dbo.Schedule s ON s.ScheduleId=d.ScheduleId
  LEFT JOIN dbo.Type_Code ts ON ts.Id=d.TutorScheduleStatus
  LEFT JOIN dbo.Type_Code ss ON ss.Id=d.StudentScheduleStatus
  LEFT JOIN dbo.Type_Code os ON os.Id=d.OperationScheduleStatus
  WHERE d.IsActive=1 AND ISNULL(s.IsActive,0)=1
   AND d.[Date]>=@ReportDate AND d.[Date]<DATEADD(day,1,@ReportDate)
   AND (ts.TypeCodeName IN (N'Class Re-Scheduled',N'Re-Schedule Demo')
     OR ss.TypeCodeName IN (N'Class Re-Scheduled',N'Re-Schedule Demo')
     OR os.TypeCodeName IN (N'Class Re-Scheduled',N'Re-Schedule Demo'))) TodayRescheduledClasses,
 (SELECT COUNT_BIG(*) FROM dbo.Student st JOIN dbo.[User] u ON u.Id=st.UserId
  WHERE st.IsActive=1 AND ISNULL(u.IsActive,0)=1) ActiveStudents,
 (SELECT COUNT_BIG(*) FROM dbo.Tutor t JOIN dbo.[User] u ON u.Id=t.UserId
  WHERE t.IsActive=1 AND ISNULL(u.IsActive,0)=1) ActiveTutors,
 CAST(NULL AS bigint) TodayPlannedTestSeries,
 CAST(NULL AS bigint) PlannedPtm;",

        OperationsDashboardQuery.PlannedClasses => @"
SELECT TOP (@Take) d.ScheduleDetailsId,d.ScheduleId,d.[Date] ClassDate,d.StartTime,d.EndTime,
 d.ScheduleType,COALESCE(d.Title,s.Title) ClassTitle,d.Status,
 st.Id StudentId,st.Code StudentCode,COALESCE(su.FullName,CONCAT(su.FirstName,N' ',su.LastName)) StudentName,
 t.Id TutorId,tu.UserCode TutorCode,COALESCE(tu.FullName,CONCAT(tu.FirstName,N' ',tu.LastName)) TutorName,
 sub.TypeCodeName SubjectName,grade.TypeCodeName GradeName,board.TypeCodeName BoardName
FROM dbo.ScheduleDetails d JOIN dbo.Schedule s ON s.ScheduleId=d.ScheduleId
JOIN dbo.Student st ON st.Id=s.StudentId LEFT JOIN dbo.[User] su ON su.Id=st.UserId
JOIN dbo.Tutor t ON t.Id=s.TutorId LEFT JOIN dbo.[User] tu ON tu.Id=t.UserId
LEFT JOIN dbo.SalesDetails course ON course.Id=s.SalesDetailsId
LEFT JOIN dbo.Type_Code sub ON sub.Id=course.SubjectId LEFT JOIN dbo.Type_Code grade ON grade.Id=st.GradeId
LEFT JOIN dbo.Type_Code board ON board.Id=st.BoardId
WHERE d.IsActive=1 AND ISNULL(s.IsActive,0)=1
 AND d.[Date]>=@ReportDate AND d.[Date]<DATEADD(day,1,@ReportDate)
ORDER BY d.StartTime,StudentName;",

        OperationsDashboardQuery.RescheduledClasses => @"
SELECT TOP (@Take) d.ScheduleDetailsId,d.ScheduleId,d.[Date] ClassDate,d.StartTime,d.EndTime,
 d.ScheduleType,COALESCE(d.Title,s.Title) ClassTitle,d.Status,
 COALESCE(su.FullName,CONCAT(su.FirstName,N' ',su.LastName)) StudentName,
 COALESCE(tu.FullName,CONCAT(tu.FirstName,N' ',tu.LastName)) TutorName,
 sub.TypeCodeName SubjectName,ts.TypeCodeName TutorStatus,ss.TypeCodeName StudentStatus,
 os.TypeCodeName OperationStatus
FROM dbo.ScheduleDetails d JOIN dbo.Schedule s ON s.ScheduleId=d.ScheduleId
JOIN dbo.Student st ON st.Id=s.StudentId LEFT JOIN dbo.[User] su ON su.Id=st.UserId
JOIN dbo.Tutor t ON t.Id=s.TutorId LEFT JOIN dbo.[User] tu ON tu.Id=t.UserId
LEFT JOIN dbo.SalesDetails course ON course.Id=s.SalesDetailsId
LEFT JOIN dbo.Type_Code sub ON sub.Id=course.SubjectId
LEFT JOIN dbo.Type_Code ts ON ts.Id=d.TutorScheduleStatus
LEFT JOIN dbo.Type_Code ss ON ss.Id=d.StudentScheduleStatus
LEFT JOIN dbo.Type_Code os ON os.Id=d.OperationScheduleStatus
WHERE d.IsActive=1 AND ISNULL(s.IsActive,0)=1
 AND d.[Date]>=@ReportDate AND d.[Date]<DATEADD(day,1,@ReportDate)
 AND (ts.TypeCodeName IN (N'Class Re-Scheduled',N'Re-Schedule Demo')
   OR ss.TypeCodeName IN (N'Class Re-Scheduled',N'Re-Schedule Demo')
   OR os.TypeCodeName IN (N'Class Re-Scheduled',N'Re-Schedule Demo'))
ORDER BY d.StartTime,StudentName;",

        OperationsDashboardQuery.ActiveStudents => @"
SELECT TOP (@Take) st.Id StudentId,st.Code StudentCode,
 COALESCE(u.FullName,CONCAT(u.FirstName,N' ',u.LastName)) StudentName,u.Email,u.Phone,
 board.TypeCodeName BoardName,grade.TypeCodeName GradeName,
 COUNT(DISTINCT CASE WHEN ISNULL(a.IsActive,0)=1 THEN a.Id END) ActiveAllocations
FROM dbo.Student st JOIN dbo.[User] u ON u.Id=st.UserId
LEFT JOIN dbo.Type_Code board ON board.Id=st.BoardId LEFT JOIN dbo.Type_Code grade ON grade.Id=st.GradeId
LEFT JOIN dbo.TutorStudentAllocations a ON a.StudentId=st.Id
WHERE st.IsActive=1 AND ISNULL(u.IsActive,0)=1
GROUP BY st.Id,st.Code,u.FullName,u.FirstName,u.LastName,u.Email,u.Phone,board.TypeCodeName,grade.TypeCodeName
ORDER BY StudentName;",

        OperationsDashboardQuery.ActiveTutors => @"
SELECT TOP (@Take) t.Id TutorId,u.UserCode,
 COALESCE(u.FullName,CONCAT(u.FirstName,N' ',u.LastName)) TutorName,u.Email,u.Phone,u.JoiningDate,
 COUNT(DISTINCT CASE WHEN ISNULL(a.IsActive,0)=1 THEN a.StudentId END) ActiveStudentCount,
 ratings.AverageRating,ratings.RatingCount
FROM dbo.Tutor t JOIN dbo.[User] u ON u.Id=t.UserId
LEFT JOIN dbo.TutorStudentAllocations a ON a.TutorId=t.Id
OUTER APPLY (SELECT CAST(AVG(CONVERT(decimal(10,2),r.Rating)) AS decimal(5,2)) AverageRating,
 COUNT_BIG(*) RatingCount FROM dbo.UserClassRating r WHERE r.RatedUserId=u.Id) ratings
WHERE t.IsActive=1 AND ISNULL(u.IsActive,0)=1
GROUP BY t.Id,u.UserCode,u.FullName,u.FirstName,u.LastName,u.Email,u.Phone,u.JoiningDate,
 ratings.AverageRating,ratings.RatingCount
ORDER BY TutorName;",

        OperationsDashboardQuery.LowEngagementTutors => @"
SELECT TOP (@Take) t.Id TutorId,u.UserCode,
 COALESCE(u.FullName,CONCAT(u.FirstName,N' ',u.LastName)) TutorName,u.JoiningDate,
 COUNT(DISTINCT a.StudentId) StudentsWithinFirstThreeMonths
FROM dbo.Tutor t JOIN dbo.[User] u ON u.Id=t.UserId
LEFT JOIN dbo.TutorStudentAllocations a ON a.TutorId=t.Id AND ISNULL(a.IsActive,0)=1
 AND a.CreatedDate>=u.JoiningDate AND a.CreatedDate<DATEADD(month,3,u.JoiningDate)
WHERE t.IsActive=1 AND ISNULL(u.IsActive,0)=1 AND u.JoiningDate IS NOT NULL
GROUP BY t.Id,u.UserCode,u.FullName,u.FirstName,u.LastName,u.JoiningDate
HAVING COUNT(DISTINCT a.StudentId)<=5
ORDER BY StudentsWithinFirstThreeMonths,TutorName;",

        OperationsDashboardQuery.CancelledClasses => @"
SELECT TOP (@Take) d.ScheduleDetailsId,d.[Date] ClassDate,d.StartTime,d.EndTime,
 st.Id StudentId,COALESCE(su.FullName,CONCAT(su.FirstName,N' ',su.LastName)) StudentName,
 t.Id TutorId,COALESCE(tu.FullName,CONCAT(tu.FirstName,N' ',tu.LastName)) TutorName,
 sub.TypeCodeName SubjectName,
 CONVERT(bit,CASE WHEN ss.TypeCodeName=N'Class Canceled' THEN 1 ELSE 0 END) IsStudentCancelled,
 CONVERT(bit,CASE WHEN ts.TypeCodeName=N'Class Canceled' THEN 1 ELSE 0 END) IsTutorCancelled,
 d.StudentComment,d.TutorComment
FROM dbo.ScheduleDetails d JOIN dbo.Schedule s ON s.ScheduleId=d.ScheduleId
JOIN dbo.Student st ON st.Id=s.StudentId LEFT JOIN dbo.[User] su ON su.Id=st.UserId
JOIN dbo.Tutor t ON t.Id=s.TutorId LEFT JOIN dbo.[User] tu ON tu.Id=t.UserId
LEFT JOIN dbo.SalesDetails course ON course.Id=s.SalesDetailsId
LEFT JOIN dbo.Type_Code sub ON sub.Id=course.SubjectId
LEFT JOIN dbo.Type_Code ts ON ts.Id=d.TutorScheduleStatus LEFT JOIN dbo.Type_Code ss ON ss.Id=d.StudentScheduleStatus
WHERE d.IsActive=1 AND ISNULL(s.IsActive,0)=1
 AND d.[Date]>=@FromDate AND d.[Date]<DATEADD(day,1,@ToDate)
 AND (ts.TypeCodeName=N'Class Canceled' OR ss.TypeCodeName=N'Class Canceled')
ORDER BY d.[Date] DESC,d.StartTime DESC;",

        OperationsDashboardQuery.MissedAttendance => @"
SELECT TOP (@Take) d.ScheduleDetailsId,d.[Date] ClassDate,d.StartTime,d.EndTime,
 COALESCE(su.FullName,CONCAT(su.FirstName,N' ',su.LastName)) StudentName,
 COALESCE(tu.FullName,CONCAT(tu.FirstName,N' ',tu.LastName)) TutorName,sub.TypeCodeName SubjectName,
 CONVERT(bit,CASE WHEN d.StudentScheduleStatus IS NULL THEN 1 ELSE 0 END) StudentAttendanceMissing,
 CONVERT(bit,CASE WHEN d.TutorScheduleStatus IS NULL THEN 1 ELSE 0 END) TutorAttendanceMissing
FROM dbo.ScheduleDetails d JOIN dbo.Schedule s ON s.ScheduleId=d.ScheduleId
JOIN dbo.Student st ON st.Id=s.StudentId LEFT JOIN dbo.[User] su ON su.Id=st.UserId
JOIN dbo.Tutor t ON t.Id=s.TutorId LEFT JOIN dbo.[User] tu ON tu.Id=t.UserId
LEFT JOIN dbo.SalesDetails course ON course.Id=s.SalesDetailsId
LEFT JOIN dbo.Type_Code sub ON sub.Id=course.SubjectId
LEFT JOIN dbo.Type_Code ts ON ts.Id=d.TutorScheduleStatus LEFT JOIN dbo.Type_Code ss ON ss.Id=d.StudentScheduleStatus
WHERE d.IsActive=1 AND ISNULL(s.IsActive,0)=1
 AND d.[Date]>=@ReportDate AND d.[Date]<DATEADD(day,1,@ReportDate)
 AND (d.StudentScheduleStatus IS NULL OR d.TutorScheduleStatus IS NULL)
 AND ISNULL(ts.TypeCodeName,N'')<>N'Class Canceled' AND ISNULL(ss.TypeCodeName,N'')<>N'Class Canceled'
ORDER BY d.StartTime,StudentName;",

        OperationsDashboardQuery.DailyClassSummary => @"
SELECT @ReportDate ReportDate,COUNT_BIG(*) ScheduledClasses,
 SUM(CASE WHEN d.Status=N'Class Completed' THEN CONVERT(bigint,1) ELSE 0 END) CompletedClasses,
 SUM(CASE WHEN ts.TypeCodeName=N'Class Canceled' OR ss.TypeCodeName=N'Class Canceled'
  THEN CONVERT(bigint,1) ELSE 0 END) CancelledClasses,
 SUM(CASE WHEN ISNULL(d.Status,N'')<>N'Class Completed' AND ISNULL(ts.TypeCodeName,N'')<>N'Class Canceled'
  AND ISNULL(ss.TypeCodeName,N'')<>N'Class Canceled' THEN CONVERT(bigint,1) ELSE 0 END) PendingOrUnclassifiedClasses
FROM dbo.ScheduleDetails d JOIN dbo.Schedule s ON s.ScheduleId=d.ScheduleId
LEFT JOIN dbo.Type_Code ts ON ts.Id=d.TutorScheduleStatus LEFT JOIN dbo.Type_Code ss ON ss.Id=d.StudentScheduleStatus
WHERE d.IsActive=1 AND ISNULL(s.IsActive,0)=1
 AND d.[Date]>=@ReportDate AND d.[Date]<DATEADD(day,1,@ReportDate);",

        OperationsDashboardQuery.TimeWiseClasses => @"
SELECT TOP (@Take) d.ScheduleDetailsId,d.StartTime,d.EndTime,
 COALESCE(su.FullName,CONCAT(su.FirstName,N' ',su.LastName)) StudentName,
 sub.TypeCodeName SubjectName,grade.TypeCodeName GradeName,
 COALESCE(tu.FullName,CONCAT(tu.FirstName,N' ',tu.LastName)) TutorName,d.ScheduleType,d.Status
FROM dbo.ScheduleDetails d JOIN dbo.Schedule s ON s.ScheduleId=d.ScheduleId
JOIN dbo.Student st ON st.Id=s.StudentId LEFT JOIN dbo.[User] su ON su.Id=st.UserId
JOIN dbo.Tutor t ON t.Id=s.TutorId LEFT JOIN dbo.[User] tu ON tu.Id=t.UserId
LEFT JOIN dbo.SalesDetails course ON course.Id=s.SalesDetailsId
LEFT JOIN dbo.Type_Code sub ON sub.Id=course.SubjectId LEFT JOIN dbo.Type_Code grade ON grade.Id=st.GradeId
WHERE d.IsActive=1 AND ISNULL(s.IsActive,0)=1
 AND d.[Date]>=@ReportDate AND d.[Date]<DATEADD(day,1,@ReportDate)
ORDER BY d.StartTime,TutorName,StudentName;",

        OperationsDashboardQuery.EnrollmentByCourse => @"
SELECT sd.SubjectId,sub.TypeCodeName CourseName,COUNT(DISTINCT s.StudentId) EnrolledStudents
FROM dbo.SalesDetails sd JOIN dbo.Sales s ON s.Id=sd.SalesId AND s.IsActive=1
LEFT JOIN dbo.Type_Code sub ON sub.Id=sd.SubjectId
WHERE sd.IsActive=1 GROUP BY sd.SubjectId,sub.TypeCodeName
ORDER BY EnrolledStudents DESC,CourseName;",

        OperationsDashboardQuery.EnrollmentTrend => @"
SELECT DATEFROMPARTS(YEAR(sd.CreatedDate),MONTH(sd.CreatedDate),1) EnrollmentMonth,
 COUNT(DISTINCT CONCAT(CONVERT(varchar(36),s.StudentId),'|',CONVERT(varchar(36),sd.SubjectId))) NewStudentCourseEnrollments,
 COUNT(DISTINCT s.StudentId) DistinctStudents
FROM dbo.SalesDetails sd JOIN dbo.Sales s ON s.Id=sd.SalesId AND s.IsActive=1
WHERE sd.IsActive=1 AND sd.CreatedDate>=@FromDate AND sd.CreatedDate<DATEADD(day,1,@ToDate)
GROUP BY DATEFROMPARTS(YEAR(sd.CreatedDate),MONTH(sd.CreatedDate),1)
ORDER BY EnrollmentMonth;",

        OperationsDashboardQuery.DailyCompletion => @"
SELECT @ReportDate ReportDate,COUNT_BIG(*) ScheduledClasses,
 SUM(CASE WHEN d.Status=N'Class Completed' THEN CONVERT(bigint,1) ELSE 0 END) CompletedClasses,
 CAST(100.0*SUM(CASE WHEN d.Status=N'Class Completed' THEN 1 ELSE 0 END)/NULLIF(COUNT_BIG(*),0) AS decimal(5,2)) CompletionPercentage
FROM dbo.ScheduleDetails d JOIN dbo.Schedule s ON s.ScheduleId=d.ScheduleId
WHERE d.IsActive=1 AND ISNULL(s.IsActive,0)=1
 AND d.[Date]>=@ReportDate AND d.[Date]<DATEADD(day,1,@ReportDate);",

        // Attendance reconciliation: a class where two parties recorded a
        // different outcome status, or start/end times that differ by more than
        // the grace window (@GraceMinutes). Only classes both parties have acted
        // on are considered. Range is driven by @FromDate / @ToDate.
        OperationsDashboardQuery.StudentMismatch => MismatchSql(
            aStatus: "d.StudentScheduleStatus", aStart: "d.StudentStartTime", aEnd: "d.StudentEndTime",
            bStatus: "d.TutorScheduleStatus", bStart: "d.TutorStartTime", bEnd: "d.TutorEndTime",
            aLabel: "StudentStatus", bLabel: "TutorStatus",
            aStartAlias: "StudentStartTime", aEndAlias: "StudentEndTime",
            bStartAlias: "TutorStartTime", bEndAlias: "TutorEndTime",
            extraColumns: "d.StudentComment,d.TutorComment"),

        // Tutor vs the operations plan: the tutor recorded an outcome, but it
        // conflicts with the operations status (when set) or the tutor's
        // start/end differs from the scheduled class time beyond the grace window.
        OperationsDashboardQuery.TutorMismatch => MismatchSql(
            aStatus: "d.TutorScheduleStatus", aStart: "d.TutorStartTime", aEnd: "d.TutorEndTime",
            bStatus: "d.OperationScheduleStatus",
            bStart: "COALESCE(d.OperationStartTime,d.StartTime)", bEnd: "COALESCE(d.OperationEndTime,d.EndTime)",
            aLabel: "TutorStatus", bLabel: "OperationStatus",
            aStartAlias: "TutorStartTime", aEndAlias: "TutorEndTime",
            bStartAlias: "OperationStartTime", bEndAlias: "OperationEndTime",
            extraColumns: "d.TutorComment,d.Comment OperationComment",
            requireBStatus: false),

        // Operations recorded an outcome that conflicts with the tutor's status
        // or the tutor's recorded start/end times.
        OperationsDashboardQuery.OperationMismatch => MismatchSql(
            aStatus: "d.OperationScheduleStatus", aStart: "d.OperationStartTime", aEnd: "d.OperationEndTime",
            bStatus: "d.TutorScheduleStatus", bStart: "d.TutorStartTime", bEnd: "d.TutorEndTime",
            aLabel: "OperationStatus", bLabel: "TutorStatus",
            aStartAlias: "OperationStartTime", aEndAlias: "OperationEndTime",
            bStartAlias: "TutorStartTime", bEndAlias: "TutorEndTime",
            extraColumns: "d.Comment OperationComment,d.TutorComment"),

        // Regular classes marked Completed - Extra Class / Prepon / Postpon (Class Status Type 1009008-1009010)
        // by the tutor, student or operations. All three count as one Extra Class category. One row per
        // ScheduleDetails, so re-saving or switching between the three statuses never double counts.
        // Window counts are computed before TOP, so they stay exact even when the list is capped.
        OperationsDashboardQuery.ExtraClasses => @"
SELECT TOP (@Take) d.ScheduleDetailsId,d.ScheduleId,d.[Date] ClassDate,d.StartTime,d.EndTime,
 st.Id StudentId,COALESCE(su.FullName,CONCAT(su.FirstName,N' ',su.LastName)) StudentName,
 t.Id TutorId,COALESCE(tu.FullName,CONCAT(tu.FirstName,N' ',tu.LastName)) TutorName,
 sub.TypeCodeName SubjectName,
 COALESCE(CASE WHEN os.TypeCodeValue IN (1009008,1009009,1009010) THEN os.TypeCodeName END,
  CASE WHEN ts.TypeCodeValue IN (1009008,1009009,1009010) THEN ts.TypeCodeName END,
  ss.TypeCodeName) Status,
 COUNT_BIG(*) OVER (PARTITION BY s.TutorId,s.StudentId) TutorStudentExtraClasses,
 COUNT_BIG(*) OVER () TotalExtraClasses
FROM dbo.ScheduleDetails d JOIN dbo.Schedule s ON s.ScheduleId=d.ScheduleId
JOIN dbo.Student st ON st.Id=s.StudentId LEFT JOIN dbo.[User] su ON su.Id=st.UserId
JOIN dbo.Tutor t ON t.Id=s.TutorId LEFT JOIN dbo.[User] tu ON tu.Id=t.UserId
LEFT JOIN dbo.SalesDetails course ON course.Id=s.SalesDetailsId
LEFT JOIN dbo.Type_Code sub ON sub.Id=course.SubjectId
LEFT JOIN dbo.Type_Code ts ON ts.Id=d.TutorScheduleStatus
LEFT JOIN dbo.Type_Code ss ON ss.Id=d.StudentScheduleStatus
LEFT JOIN dbo.Type_Code os ON os.Id=d.OperationScheduleStatus
WHERE d.IsActive=1 AND ISNULL(s.IsActive,0)=1 AND d.ScheduleType=N'Class'
 AND d.[Date]>=@FromDate AND d.[Date]<DATEADD(day,1,@ToDate)
 AND (ts.TypeCodeValue IN (1009008,1009009,1009010)
   OR ss.TypeCodeValue IN (1009008,1009009,1009010)
   OR os.TypeCodeValue IN (1009008,1009009,1009010))
ORDER BY d.[Date] DESC,d.StartTime DESC;",

        _ => throw new ArgumentOutOfRangeException(nameof(query), query, null)
    };

    private static string MismatchSql(
        string aStatus, string aStart, string aEnd,
        string bStatus, string bStart, string bEnd,
        string aLabel, string bLabel,
        string aStartAlias, string aEndAlias,
        string bStartAlias, string bEndAlias,
        string extraColumns,
        bool requireBStatus = true)
    {
        var statusFilter = requireBStatus
            ? $"{aStatus} IS NOT NULL AND {bStatus} IS NOT NULL"
            : $"{aStatus} IS NOT NULL";
        var statusDiff = requireBStatus
            ? $"{aStatus}<>{bStatus}"
            : $"({bStatus} IS NOT NULL AND {aStatus}<>{bStatus})";
        return $@"
SELECT TOP (@Take) d.ScheduleDetailsId,d.ScheduleId,d.[Date] ClassDate,d.StartTime,d.EndTime,
 st.Id StudentId,COALESCE(su.FullName,CONCAT(su.FirstName,N' ',su.LastName)) StudentName,
 t.Id TutorId,COALESCE(tu.FullName,CONCAT(tu.FirstName,N' ',tu.LastName)) TutorName,
 sub.TypeCodeName SubjectName,grade.TypeCodeName GradeName,
 aStatus.TypeCodeName {aLabel},bStatus.TypeCodeName {bLabel},
 {aStart} {aStartAlias},{aEnd} {aEndAlias},{bStart} {bStartAlias},{bEnd} {bEndAlias},
 {extraColumns}
FROM dbo.ScheduleDetails d JOIN dbo.Schedule s ON s.ScheduleId=d.ScheduleId
JOIN dbo.Student st ON st.Id=s.StudentId LEFT JOIN dbo.[User] su ON su.Id=st.UserId
JOIN dbo.Tutor t ON t.Id=s.TutorId LEFT JOIN dbo.[User] tu ON tu.Id=t.UserId
LEFT JOIN dbo.SalesDetails course ON course.Id=s.SalesDetailsId
LEFT JOIN dbo.Type_Code sub ON sub.Id=course.SubjectId
LEFT JOIN dbo.Type_Code grade ON grade.Id=st.GradeId
LEFT JOIN dbo.Type_Code aStatus ON aStatus.Id={aStatus}
LEFT JOIN dbo.Type_Code bStatus ON bStatus.Id={bStatus}
WHERE d.IsActive=1 AND ISNULL(s.IsActive,0)=1
 AND d.[Date]>=@FromDate AND d.[Date]<DATEADD(day,1,@ToDate)
 AND {statusFilter}
 AND (
   {statusDiff}
   OR ABS(DATEDIFF(MINUTE,CAST({aStart} AS time),CAST({bStart} AS time)))>@GraceMinutes
   OR ABS(DATEDIFF(MINUTE,CAST({aEnd} AS time),CAST({bEnd} AS time)))>@GraceMinutes
 )
ORDER BY d.[Date] DESC,d.StartTime DESC;";
    }

    private async Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> ExecuteAsync(
        string sql,
        DateTime reportDate,
        DateTime fromDate,
        DateTime toDate,
        int take,
        CancellationToken token)
    {
        DbConnection connection = _dbContext.Database.GetDbConnection();
        var openedHere = connection.State != ConnectionState.Open;
        if (openedHere) await connection.OpenAsync(token);

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = sql;
            command.CommandTimeout = 30;

            if (sql.Contains("@ReportDate", StringComparison.Ordinal))
                Add(command, "@ReportDate", DbType.Date, reportDate.Date);
            if (sql.Contains("@FromDate", StringComparison.Ordinal))
                Add(command, "@FromDate", DbType.Date, fromDate.Date);
            if (sql.Contains("@ToDate", StringComparison.Ordinal))
                Add(command, "@ToDate", DbType.Date, toDate.Date);
            if (sql.Contains("@Take", StringComparison.Ordinal))
                Add(command, "@Take", DbType.Int32, take);
            if (sql.Contains("@GraceMinutes", StringComparison.Ordinal))
                Add(command, "@GraceMinutes", DbType.Int32, 10);

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
        finally
        {
            if (openedHere) await connection.CloseAsync();
        }
    }

    private static void Add(DbCommand command, string name, DbType type, object value)
    {
        var parameter = command.CreateParameter();
        parameter.ParameterName = name;
        parameter.DbType = type;
        parameter.Value = value;
        command.Parameters.Add(parameter);
    }
}

