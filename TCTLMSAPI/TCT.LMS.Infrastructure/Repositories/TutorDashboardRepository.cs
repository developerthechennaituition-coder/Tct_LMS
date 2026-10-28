using System.Data;
using System.Data.Common;
using Microsoft.EntityFrameworkCore;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Data.Common;

namespace TCT.LMS.Infrastructure.Repositories;

public sealed class TutorDashboardRepository : ITutorDashboardRepository
{
    private readonly ApplicationDbContext _dbContext;

    public TutorDashboardRepository(ApplicationDbContext dbContext) => _dbContext = dbContext;

    public Task<Guid?> GetTutorIdByUserAsync(Guid userId, CancellationToken token)
        => _dbContext.Tutor.AsNoTracking()
            .Where(x => x.UserId == userId && x.IsActive)
            .Select(x => (Guid?)x.Id)
            .SingleOrDefaultAsync(token);

    public Task<bool> BelongsToUserAsync(Guid tutorId, Guid userId, CancellationToken token)
        => _dbContext.Tutor.AsNoTracking()
            .AnyAsync(x => x.Id == tutorId && x.UserId == userId && x.IsActive, token);

    public Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> QueryAsync(
        TutorDashboardQuery query, Guid tutorId, DateTime? fromDate, DateTime? toDate,
        int? take, CancellationToken token)
        => ExecuteAsync(Sql(query), tutorId, fromDate, toDate, take, token);

    private static string Sql(TutorDashboardQuery query) => query switch
    {
        TutorDashboardQuery.Profile => @"
SELECT t.Id TutorId,t.UserId,u.UserCode,COALESCE(u.FullName,CONCAT(u.FirstName,N' ',u.LastName)) TutorName,
 u.Email,u.Phone,u.AlternatePhone,u.DOB,u.Gender,u.Location,u.JoiningDate,t.IsActive,
 COUNT(DISTINCT CASE WHEN td.IsActive=1 THEN td.SubjectId END) SubjectCount,
 CAST(AVG(CONVERT(decimal(10,2),r.Rating)) AS decimal(5,2)) OverallRating,
 COUNT(DISTINCT r.Id) RatingCount
FROM dbo.Tutor t JOIN dbo.[User] u ON u.Id=t.UserId
LEFT JOIN dbo.TutorDetails td ON td.TutorId=t.Id
LEFT JOIN dbo.UserClassRating r ON r.RatedUserId=t.UserId
WHERE t.Id=@TutorId AND t.IsActive=1
GROUP BY t.Id,t.UserId,u.UserCode,u.FullName,u.FirstName,u.LastName,u.Email,u.Phone,u.AlternatePhone,
 u.DOB,u.Gender,u.Location,u.JoiningDate,t.IsActive;",

        TutorDashboardQuery.DemoVideos => @"
DECLARE @UserId uniqueidentifier=(SELECT UserId FROM dbo.Tutor WHERE Id=@TutorId AND IsActive=1);
SELECT d.Id DocumentId,d.DocumentName,d.DocumentDescription,d.ReferenceId,d.DocumentTypeId,
 ds.Id DocumentStorageId,ds.FileName,ds.ContentType,ds.FileSize,ds.FilePath,d.CreatedDate
FROM dbo.Documents d
LEFT JOIN dbo.DocumentStorage ds ON ds.DocumentId=d.Id AND ds.IsActive=1
LEFT JOIN dbo.Type_Code dt ON dt.Id=d.DocumentTypeId
WHERE d.UserId=@UserId AND d.IsActive=1
 AND (d.DocumentName=N'Demo Video' OR dt.TypeCodeName=N'Demo Video')
ORDER BY d.CreatedDate DESC;",

        TutorDashboardQuery.Subjects => @"
DECLARE @UserId uniqueidentifier=(SELECT UserId FROM dbo.Tutor WHERE Id=@TutorId AND IsActive=1);
SELECT td.Id TutorDetailId,td.SubjectId,subj.TypeCodeName SubjectName,td.BoardId,board.TypeCodeName BoardName,
 td.GradeId,grade.TypeCodeName GradeName,td.GradeGroupId,gg.TypeCodeName GradeGroupName,
 td.TutorPayment StandardPayment,
 CAST(AVG(CASE WHEN r.ReferenceId=td.SubjectId OR r.Topic=subj.TypeCodeName
  THEN CONVERT(decimal(10,2),r.Rating) END) AS decimal(5,2)) SubjectRating,
 COUNT(CASE WHEN r.ReferenceId=td.SubjectId OR r.Topic=subj.TypeCodeName THEN 1 END) SubjectRatingCount
FROM dbo.TutorDetails td
LEFT JOIN dbo.Type_Code subj ON subj.Id=td.SubjectId
LEFT JOIN dbo.Type_Code board ON board.Id=td.BoardId
LEFT JOIN dbo.Type_Code grade ON grade.Id=td.GradeId
LEFT JOIN dbo.Type_Code gg ON gg.Id=td.GradeGroupId
LEFT JOIN dbo.UserClassRating r ON r.RatedUserId=@UserId
WHERE td.TutorId=@TutorId AND td.IsActive=1
GROUP BY td.Id,td.SubjectId,subj.TypeCodeName,td.BoardId,board.TypeCodeName,td.GradeId,grade.TypeCodeName,
 td.GradeGroupId,gg.TypeCodeName,td.TutorPayment
ORDER BY SubjectName,GradeName;",

        TutorDashboardQuery.Schedule => @"
SELECT d.ScheduleDetailsId,s.ScheduleId,s.SalesDetailsId,s.StudentId,
 COALESCE(su.FullName,CONCAT(su.FirstName,N' ',su.LastName)) StudentName,
 course.SubjectId,subj.TypeCodeName SubjectName,s.Title ScheduleTitle,COALESCE(d.Title,s.Title) ClassTitle,
 d.[Date] ClassDate,d.StartTime,d.EndTime,d.ScheduleType,COALESCE(d.MeetingLink,s.MeetingLink) MeetingLink,
 d.Status,tss.TypeCodeName TutorStatus,sss.TypeCodeName StudentStatus,oss.TypeCodeName OperationStatus,
 d.IsTutorPresent,d.IsStudentPresent,d.TutorStartTime,d.TutorEndTime,d.TutorComment,d.StudentComment
FROM dbo.Schedule s JOIN dbo.ScheduleDetails d ON d.ScheduleId=s.ScheduleId
JOIN dbo.Student st ON st.Id=s.StudentId LEFT JOIN dbo.[User] su ON su.Id=st.UserId
LEFT JOIN dbo.SalesDetails course ON course.Id=s.SalesDetailsId LEFT JOIN dbo.Type_Code subj ON subj.Id=course.SubjectId
LEFT JOIN dbo.Type_Code tss ON tss.Id=d.TutorScheduleStatus
LEFT JOIN dbo.Type_Code sss ON sss.Id=d.StudentScheduleStatus
LEFT JOIN dbo.Type_Code oss ON oss.Id=d.OperationScheduleStatus
WHERE s.TutorId=@TutorId AND s.IsActive=1 AND d.IsActive=1
 AND d.[Date]>=@FromDate AND d.[Date]<DATEADD(day,1,@ToDate)
ORDER BY d.[Date],d.StartTime;",

        TutorDashboardQuery.DemoHistory => @"
SELECT sd.Id SalesDetailsId,sa.StudentId,COALESCE(u.FullName,CONCAT(u.FirstName,N' ',u.LastName)) StudentName,
 sd.SubjectId,subj.TypeCodeName SubjectName,status.TypeCodeValue StatusCode,status.TypeCodeName DemoStatus,
 sd.FollowUpDate,sd.ClassActualDate,sd.CreatedDate,sd.ModifiedDate
FROM dbo.SalesDetails sd JOIN dbo.Sales sa ON sa.Id=sd.SalesId
JOIN dbo.Student st ON st.Id=sa.StudentId LEFT JOIN dbo.[User] u ON u.Id=st.UserId
LEFT JOIN dbo.Type_Code subj ON subj.Id=sd.SubjectId LEFT JOIN dbo.Type_Code status ON status.Id=sd.Status
WHERE sd.TutorId=@TutorId
 AND (status.TypeCodeName LIKE N'%Demo%' OR status.TypeCodeName LIKE N'%Drop%')
ORDER BY COALESCE(sd.ModifiedDate,sd.CreatedDate) DESC;",

        TutorDashboardQuery.AllocationHistory => @"
SELECT h.HistoryId,h.AllocationId,a.StudentId,
 COALESCE(u.FullName,CONCAT(u.FirstName,N' ',u.LastName)) StudentName,
 a.SalesDetailsId,sd.SubjectId,subj.TypeCodeName SubjectName,h.PreviousStatus,h.NewStatus,
 h.ActionTakenBy,h.ActionEffectiveDate,h.Notes
FROM dbo.TutorStudentAllocationHistory h
JOIN dbo.TutorStudentAllocations a ON a.Id=h.AllocationId
JOIN dbo.Student st ON st.Id=a.StudentId LEFT JOIN dbo.[User] u ON u.Id=st.UserId
LEFT JOIN dbo.SalesDetails sd ON sd.Id=a.SalesDetailsId LEFT JOIN dbo.Type_Code subj ON subj.Id=sd.SubjectId
WHERE a.TutorId=@TutorId ORDER BY h.ActionEffectiveDate DESC;",

        TutorDashboardQuery.CurrentStudents => @"
SELECT a.Id AllocationId,a.StudentId,COALESCE(u.FullName,CONCAT(u.FirstName,N' ',u.LastName)) StudentName,
 st.Code StudentCode,st.BoardId,board.TypeCodeName BoardName,st.GradeId,grade.TypeCodeName GradeName,
 a.SalesDetailsId,sd.SubjectId,subj.TypeCodeName SubjectName,a.PaymentAmount,a.StatusCode,a.PaymentStatus,
 a.Note,a.CreatedDate
FROM dbo.TutorStudentAllocations a JOIN dbo.Student st ON st.Id=a.StudentId
LEFT JOIN dbo.[User] u ON u.Id=st.UserId LEFT JOIN dbo.Type_Code board ON board.Id=st.BoardId
LEFT JOIN dbo.Type_Code grade ON grade.Id=st.GradeId LEFT JOIN dbo.SalesDetails sd ON sd.Id=a.SalesDetailsId
LEFT JOIN dbo.Type_Code subj ON subj.Id=sd.SubjectId
WHERE a.TutorId=@TutorId AND a.IsActive=1 ORDER BY StudentName;",

        TutorDashboardQuery.Availability => @"
DECLARE @UserId uniqueidentifier=(SELECT UserId FROM dbo.Tutor WHERE Id=@TutorId AND IsActive=1);
SELECT ua.Id AvailabilityId,CONVERT(uniqueidentifier,NULL) ExceptionId,ua.DayOfWeek,ua.StartTime,ua.EndTime,
 ua.StartDate,ua.EndDate,ua.TimeZone,ua.IsRecurring,CONVERT(bit,1) IsAvailable,N'Availability' SourceType
FROM dbo.UserAvailability ua WHERE ua.UserId=@UserId AND ua.IsActive=1
UNION ALL
SELECT NULL,e.Id,e.DayOfWeek,e.StartTime,e.EndTime,e.StartDate,e.EndDate,e.TimeZone,NULL,e.IsAvailable,N'Exception'
FROM dbo.UserAvailabilityExceptions e WHERE e.UserId=@UserId AND e.IsActive=1
ORDER BY DayOfWeek,StartTime;",

        TutorDashboardQuery.Ratings => @"
DECLARE @UserId uniqueidentifier=(SELECT UserId FROM dbo.Tutor WHERE Id=@TutorId AND IsActive=1);
SELECT r.Id RatingId,r.RaterId,COALESCE(u.FullName,CONCAT(u.FirstName,N' ',u.LastName)) RaterName,
 r.ReferenceId,r.Topic,r.Rating,r.RatingTypeId,rt.TypeCodeName RatingType,r.Feedback,r.RatedAt
FROM dbo.UserClassRating r LEFT JOIN dbo.[User] u ON u.Id=r.RaterId
LEFT JOIN dbo.Type_Code rt ON rt.Id=r.RatingTypeId
WHERE r.RatedUserId=@UserId ORDER BY r.RatedAt DESC;",

        TutorDashboardQuery.MonthlyHours => @"
SELECT DATEFROMPARTS(YEAR(d.[Date]),MONTH(d.[Date]),1) MonthStart,COUNT_BIG(*) ScheduledClasses,
 CAST(SUM(CASE WHEN d.StartTime IS NOT NULL AND d.EndTime IS NOT NULL
  THEN DATEDIFF(minute,d.StartTime,d.EndTime) ELSE 0 END)/60.0 AS decimal(10,2)) ScheduledHours,
 SUM(CASE WHEN ts.TypeCodeName=N'Class Completed' OR d.IsTutorPresent=1 THEN 1 ELSE 0 END) CompletedClasses,
 CAST(SUM(CASE WHEN ts.TypeCodeName=N'Class Completed' OR d.IsTutorPresent=1
  THEN DATEDIFF(minute,COALESCE(d.TutorStartTime,d.StartTime),COALESCE(d.TutorEndTime,d.EndTime)) ELSE 0 END)/60.0 AS decimal(10,2)) CompletedHours
FROM dbo.Schedule s JOIN dbo.ScheduleDetails d ON d.ScheduleId=s.ScheduleId
LEFT JOIN dbo.Type_Code ts ON ts.Id=d.TutorScheduleStatus
WHERE s.TutorId=@TutorId AND s.IsActive=1 AND d.IsActive=1
 AND d.[Date]>=@FromDate AND d.[Date]<DATEADD(day,1,@ToDate)
GROUP BY DATEFROMPARTS(YEAR(d.[Date]),MONTH(d.[Date]),1) ORDER BY MonthStart;",

        TutorDashboardQuery.CancellationHistory => @"
SELECT DATEFROMPARTS(YEAR(d.[Date]),MONTH(d.[Date]),1) MonthStart,COUNT_BIG(*) ScheduledClasses,
 SUM(CASE WHEN ts.TypeCodeName LIKE N'%Cancel%' THEN 1 ELSE 0 END) TutorCancellations,
 SUM(CASE WHEN ss.TypeCodeName LIKE N'%Cancel%' THEN 1 ELSE 0 END) StudentCancellations,
 CAST(100.0*SUM(CASE WHEN ts.TypeCodeName LIKE N'%Cancel%' THEN 1 ELSE 0 END)/NULLIF(COUNT(*),0) AS decimal(5,2)) TutorCancellationPercent
FROM dbo.Schedule s JOIN dbo.ScheduleDetails d ON d.ScheduleId=s.ScheduleId
LEFT JOIN dbo.Type_Code ts ON ts.Id=d.TutorScheduleStatus
LEFT JOIN dbo.Type_Code ss ON ss.Id=d.StudentScheduleStatus
WHERE s.TutorId=@TutorId AND s.IsActive=1 AND d.IsActive=1
GROUP BY DATEFROMPARTS(YEAR(d.[Date]),MONTH(d.[Date]),1) ORDER BY MonthStart DESC;",

        TutorDashboardQuery.Homework => @"
DECLARE @UserId uniqueidentifier=(SELECT UserId FROM dbo.Tutor WHERE Id=@TutorId AND IsActive=1);
SELECT TOP (@Take) d.Id DocumentId,d.ReferenceId,d.DocumentName,d.DocumentDescription,d.DocumentTypeId,
 ds.Id DocumentStorageId,ds.FileName,ds.ContentType,ds.FileSize,ds.FilePath,d.CreatedDate
FROM dbo.Documents d LEFT JOIN dbo.DocumentStorage ds ON ds.DocumentId=d.Id AND ds.IsActive=1
LEFT JOIN dbo.Type_Code dt ON dt.Id=d.DocumentTypeId
WHERE d.UserId=@UserId AND d.IsActive=1
 AND (d.DocumentName=N'Homework' OR dt.TypeCodeName=N'Homework')
ORDER BY d.CreatedDate DESC;",

        TutorDashboardQuery.Summary => @"
DECLARE @UserId uniqueidentifier=(SELECT UserId FROM dbo.Tutor WHERE Id=@TutorId AND IsActive=1);
SELECT
 (SELECT COUNT(DISTINCT SubjectId) FROM dbo.TutorDetails WHERE TutorId=@TutorId AND IsActive=1) SubjectCount,
 (SELECT COUNT_BIG(*) FROM dbo.TutorStudentAllocations WHERE TutorId=@TutorId AND IsActive=1) CurrentStudentCount,
 (SELECT COUNT_BIG(*) FROM dbo.Schedule s JOIN dbo.ScheduleDetails d ON d.ScheduleId=s.ScheduleId
  WHERE s.TutorId=@TutorId AND s.IsActive=1 AND d.IsActive=1 AND d.[Date]>=CAST(GETDATE() AS date)
   AND (d.TutorScheduleStatus IS NULL OR d.StudentScheduleStatus IS NULL)) UpcomingClassCount,
 (SELECT CAST(AVG(CONVERT(decimal(10,2),Rating)) AS decimal(5,2)) FROM dbo.UserClassRating WHERE RatedUserId=@UserId) OverallRating,
 (SELECT COUNT_BIG(*) FROM dbo.UserClassRating WHERE RatedUserId=@UserId) RatingCount,
 (SELECT COUNT_BIG(*) FROM dbo.Schedule s JOIN dbo.ScheduleDetails d ON d.ScheduleId=s.ScheduleId
  LEFT JOIN dbo.Type_Code ts ON ts.Id=d.TutorScheduleStatus
  WHERE s.TutorId=@TutorId AND s.IsActive=1 AND d.IsActive=1
   AND MONTH(d.[Date])=MONTH(GETDATE()) AND YEAR(d.[Date])=YEAR(GETDATE())
   AND ts.TypeCodeName LIKE N'%Cancel%') CurrentMonthTutorCancellations,
 -- Regular classes marked Completed - Extra Class / Prepon / Postpon (1009008-1009010) by any party; one per class.
 (SELECT COUNT_BIG(*) FROM dbo.Schedule s JOIN dbo.ScheduleDetails d ON d.ScheduleId=s.ScheduleId
  LEFT JOIN dbo.Type_Code ts ON ts.Id=d.TutorScheduleStatus
  LEFT JOIN dbo.Type_Code ss ON ss.Id=d.StudentScheduleStatus
  LEFT JOIN dbo.Type_Code os ON os.Id=d.OperationScheduleStatus
  WHERE s.TutorId=@TutorId AND s.IsActive=1 AND d.IsActive=1 AND d.ScheduleType=N'Class'
   AND MONTH(d.[Date])=MONTH(GETDATE()) AND YEAR(d.[Date])=YEAR(GETDATE())
   AND (ts.TypeCodeValue IN (1009008,1009009,1009010)
     OR ss.TypeCodeValue IN (1009008,1009009,1009010)
     OR os.TypeCodeValue IN (1009008,1009009,1009010))) CurrentMonthExtraClasses;",

        _ => throw new ArgumentOutOfRangeException(nameof(query), query, null)
    };

    private async Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> ExecuteAsync(
        string sql, Guid tutorId, DateTime? fromDate, DateTime? toDate,
        int? take, CancellationToken token)
    {
        DbConnection connection = _dbContext.Database.GetDbConnection();
        var openedHere = connection.State != ConnectionState.Open;
        if (openedHere) await connection.OpenAsync(token);

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = sql;
            command.CommandTimeout = 30;
            Add(command, "@TutorId", DbType.Guid, tutorId);
            if (sql.Contains("@FromDate", StringComparison.Ordinal))
                Add(command, "@FromDate", DbType.Date, fromDate!.Value.Date);
            if (sql.Contains("@ToDate", StringComparison.Ordinal))
                Add(command, "@ToDate", DbType.Date, toDate!.Value.Date);
            if (sql.Contains("@Take", StringComparison.Ordinal))
                Add(command, "@Take", DbType.Int32, take ?? 100);

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

