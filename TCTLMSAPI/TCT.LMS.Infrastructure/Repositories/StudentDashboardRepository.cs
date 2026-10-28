using System.Data;
using System.Data.Common;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Data.Common;

namespace TCT.LMS.Infrastructure.Repositories;

public sealed class StudentDashboardRepository : IStudentDashboardRepository
{
    private readonly ApplicationDbContext _dbContext;
    public StudentDashboardRepository(ApplicationDbContext dbContext) => _dbContext = dbContext;

    public Task<Guid?> GetStudentIdByUserAsync(Guid userId, CancellationToken token)
        => _dbContext.Student.AsNoTracking()
            .Where(x => x.UserId == userId && x.IsActive)
            .Select(x => (Guid?)x.Id)
            .SingleOrDefaultAsync(token);

    public Task<bool> BelongsToUserAsync(Guid studentId, Guid userId, CancellationToken token)
        => _dbContext.Student.AsNoTracking().AnyAsync(x => x.Id == studentId && x.UserId == userId && x.IsActive, token);

    public Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> QueryAsync(
        StudentDashboardQuery query, Guid studentId, DateTime? fromDate, DateTime? toDate,
        int? take, CancellationToken token)
        => ExecuteAsync(Sql(query), studentId, fromDate, toDate, take, token);

    private static string Sql(StudentDashboardQuery query) => query switch
    {
        StudentDashboardQuery.Profile => @"
SELECT s.Id StudentId,s.UserId,COALESCE(u.FullName,CONCAT(u.FirstName,N' ',u.LastName)) StudentName,
 s.Code StudentCode,u.Email,u.Phone,u.AlternatePhone,u.DOB,u.Gender,u.Location,s.ParentName,
 b.TypeCodeName BoardName,g.TypeCodeName GradeName,r.TypeCodeName OverallRiskStatus
FROM dbo.Student s JOIN dbo.[User] u ON u.Id=s.UserId
LEFT JOIN dbo.Type_Code b ON b.Id=s.BoardId AND b.IsActive=1
LEFT JOIN dbo.Type_Code g ON g.Id=s.GradeId AND g.IsActive=1
LEFT JOIN dbo.Type_Code r ON r.Id=s.StudentRiskStatus
WHERE s.Id=@StudentId AND s.IsActive=1;",

        StudentDashboardQuery.Courses => @"
SELECT sd.Id CourseEnrollmentId,sd.SubjectId,subj.TypeCodeName CourseName,sa.BoardId,board.TypeCodeName BoardName,
 sa.GradeId,grade.TypeCodeName GradeName,sd.TutorId,COALESCE(tu.FullName,CONCAT(tu.FirstName,N' ',tu.LastName)) TutorName,
 st.TypeCodeName EnrollmentStatus,risk.TypeCodeName RiskStatus,sd.NoOfSessionPerWeek,
 COUNT(DISTINCT sch.ScheduleId) ScheduleCount,
 COUNT(DISTINCT det.ScheduleDetailsId) TotalScheduledClasses,
 COUNT(DISTINCT CASE WHEN det.TutorScheduleStatus IS NOT NULL AND det.StudentScheduleStatus IS NOT NULL THEN det.ScheduleDetailsId END) CompletedClasses,
 COUNT(DISTINCT CASE WHEN det.[Date]>=CAST(GETDATE() AS date)
  AND (det.TutorScheduleStatus IS NULL OR det.StudentScheduleStatus IS NULL) THEN det.ScheduleDetailsId END) UpcomingClasses,
 COUNT(DISTINCT CASE WHEN det.IsStudentPresent=1 THEN det.ScheduleDetailsId END) ClassesPresent,
 COUNT(DISTINCT CASE WHEN MONTH(det.[Date])=MONTH(GETDATE()) AND YEAR(det.[Date])=YEAR(GETDATE()) THEN det.ScheduleDetailsId END) CurrentMonthScheduledClasses,
 COUNT(DISTINCT CASE WHEN MONTH(det.[Date])=MONTH(GETDATE()) AND YEAR(det.[Date])=YEAR(GETDATE())
  AND det.TutorScheduleStatus IS NOT NULL AND det.StudentScheduleStatus IS NOT NULL THEN det.ScheduleDetailsId END) CurrentMonthCompletedClasses,
 COUNT(DISTINCT CASE WHEN MONTH(det.[Date])=MONTH(GETDATE()) AND YEAR(det.[Date])=YEAR(GETDATE())
  AND det.[Date]>=CAST(GETDATE() AS date) AND (det.TutorScheduleStatus IS NULL OR det.StudentScheduleStatus IS NULL) THEN det.ScheduleDetailsId END) CurrentMonthUpcomingClasses,
 MIN(det.[Date]) FirstScheduleDate,MAX(det.[Date]) LastScheduleDate,
 CAST(100.0*COUNT(DISTINCT CASE WHEN det.[Date]<DATEADD(day,1,CAST(GETDATE() AS date)) AND det.IsStudentPresent=1 THEN det.ScheduleDetailsId END)
 /NULLIF(COUNT(DISTINCT CASE WHEN det.[Date]<DATEADD(day,1,CAST(GETDATE() AS date)) AND det.IsStudentPresent IS NOT NULL THEN det.ScheduleDetailsId END),0) AS decimal(5,2)) AttendancePercent
FROM dbo.Sales sa JOIN dbo.SalesDetails sd ON sd.SalesId=sa.Id AND sd.IsActive=1
LEFT JOIN dbo.Type_Code subj ON subj.Id=sd.SubjectId LEFT JOIN dbo.Type_Code board ON board.Id=sa.BoardId
LEFT JOIN dbo.Type_Code grade ON grade.Id=sa.GradeId LEFT JOIN dbo.Type_Code st ON st.Id=sd.Status
LEFT JOIN dbo.Type_Code risk ON risk.Id=sd.StudentRiskStatus LEFT JOIN dbo.Tutor t ON t.Id=sd.TutorId AND t.IsActive=1
LEFT JOIN dbo.[User] tu ON tu.Id=t.UserId LEFT JOIN dbo.Schedule sch ON sch.SalesDetailsId=sd.Id AND sch.IsActive=1
LEFT JOIN dbo.ScheduleDetails det ON det.ScheduleId=sch.ScheduleId AND det.IsActive=1
WHERE sa.StudentId=@StudentId AND sa.IsActive=1
GROUP BY sd.Id,sd.SubjectId,subj.TypeCodeName,sa.BoardId,board.TypeCodeName,sa.GradeId,grade.TypeCodeName,
 sd.TutorId,tu.FullName,tu.FirstName,tu.LastName,st.TypeCodeName,risk.TypeCodeName,sd.NoOfSessionPerWeek
ORDER BY CourseName;",

        StudentDashboardQuery.UpcomingClasses => @"
SELECT TOP (@Take) det.ScheduleDetailsId,sch.SalesDetailsId CourseEnrollmentId,course.SubjectId,subj.TypeCodeName SubjectName,
 sch.Title ScheduleTitle,COALESCE(det.Title,sch.Title) ClassTitle,det.[Date] ClassDate,det.StartTime,det.EndTime,
 COALESCE(det.MeetingLink,sch.MeetingLink) MeetingLink,det.ScheduleType,det.Status,
 COALESCE(tu.FullName,CONCAT(tu.FirstName,N' ',tu.LastName)) TutorName
FROM dbo.Sales sa JOIN dbo.SalesDetails sd ON sd.SalesId=sa.Id AND sd.IsActive=1
JOIN dbo.Schedule sch ON sch.SalesDetailsId=sd.Id JOIN dbo.ScheduleDetails det ON det.ScheduleId=sch.ScheduleId
LEFT JOIN dbo.SalesDetails course ON course.Id=sch.SalesDetailsId LEFT JOIN dbo.Type_Code subj ON subj.Id=course.SubjectId LEFT JOIN dbo.Tutor t ON t.Id=sch.TutorId
LEFT JOIN dbo.[User] tu ON tu.Id=t.UserId
WHERE sa.StudentId=@StudentId AND sa.IsActive=1 AND sch.IsActive=1 AND det.IsActive=1
 AND det.[Date]>=CAST(GETDATE() AS date)
 AND (det.TutorScheduleStatus IS NULL OR det.StudentScheduleStatus IS NULL)
 ORDER BY det.[Date],det.StartTime;",

        StudentDashboardQuery.Attendance => @"
SELECT det.ScheduleDetailsId,course.SubjectId,subj.TypeCodeName SubjectName,det.[Date] ClassDate,det.StartTime,det.EndTime,
 det.IsStudentPresent,CASE WHEN det.IsStudentPresent=1 THEN 'Present' WHEN det.IsStudentPresent=0 THEN 'Absent' ELSE 'Not marked' END AttendanceStatus,
 det.StudentStartTime,det.StudentEndTime,CASE WHEN det.IsStudentPresent=1 AND det.StudentStartTime>det.StartTime
 THEN DATEDIFF(minute,det.StartTime,det.StudentStartTime) END MinutesLate,det.StudentComment,det.TutorComment
FROM dbo.Sales sa JOIN dbo.SalesDetails sd ON sd.SalesId=sa.Id AND sd.IsActive=1
JOIN dbo.Schedule sch ON sch.SalesDetailsId=sd.Id JOIN dbo.ScheduleDetails det ON det.ScheduleId=sch.ScheduleId
LEFT JOIN dbo.SalesDetails course ON course.Id=sch.SalesDetailsId LEFT JOIN dbo.Type_Code subj ON subj.Id=course.SubjectId
WHERE sa.StudentId=@StudentId AND sa.IsActive=1 AND sch.IsActive=1 AND det.IsActive=1
 AND det.[Date]>=@FromDate AND det.[Date]<DATEADD(day,1,@ToDate)
ORDER BY det.[Date] DESC,det.StartTime DESC;",

        StudentDashboardQuery.MonthlyAttendance => @"
SELECT DATEFROMPARTS(YEAR(det.[Date]),MONTH(det.[Date]),1) MonthStart,COUNT(*) MarkedClasses,
 SUM(CASE WHEN det.IsStudentPresent=1 THEN 1 ELSE 0 END) PresentCount,
 SUM(CASE WHEN det.IsStudentPresent=0 THEN 1 ELSE 0 END) AbsentCount,
 CAST(100.0*SUM(CASE WHEN det.IsStudentPresent=1 THEN 1 ELSE 0 END)/NULLIF(COUNT(*),0) AS decimal(5,2)) AttendancePercent
FROM dbo.Sales sa JOIN dbo.SalesDetails sd ON sd.SalesId=sa.Id AND sd.IsActive=1
JOIN dbo.Schedule sch ON sch.SalesDetailsId=sd.Id JOIN dbo.ScheduleDetails det ON det.ScheduleId=sch.ScheduleId
WHERE sa.StudentId=@StudentId AND sa.IsActive=1 AND sch.IsActive=1 AND det.IsActive=1 AND det.IsStudentPresent IS NOT NULL
 AND det.[Date]<DATEADD(day,1,CAST(GETDATE() AS date))
GROUP BY DATEFROMPARTS(YEAR(det.[Date]),MONTH(det.[Date]),1) ORDER BY MonthStart;",

        StudentDashboardQuery.Tutors => @"
DECLARE @UserId uniqueidentifier=(SELECT UserId FROM dbo.Student WHERE Id=@StudentId AND IsActive=1);
SELECT t.Id TutorId,tu.Id TutorUserId,COALESCE(tu.FullName,CONCAT(tu.FirstName,N' ',tu.LastName)) TutorName,
 COUNT(DISTINCT sd.Id) AssignedCourseCount,
 CAST(AVG(CASE WHEN r.RaterId=@UserId THEN CONVERT(decimal(10,2),r.Rating) END) AS decimal(5,2)) MyAverageRating,
 COUNT(CASE WHEN r.RaterId=@UserId THEN 1 END) MyRatingCount,MAX(CASE WHEN r.RaterId=@UserId THEN r.RatedAt END) LastRatedAt
FROM dbo.Sales sa JOIN dbo.SalesDetails sd ON sd.SalesId=sa.Id AND sd.IsActive=1
JOIN dbo.Tutor t ON t.Id=sd.TutorId AND t.IsActive=1 JOIN dbo.[User] tu ON tu.Id=t.UserId
LEFT JOIN dbo.UserClassRating r ON r.RatedUserId=tu.Id
WHERE sa.StudentId=@StudentId AND sa.IsActive=1 GROUP BY t.Id,tu.Id,tu.FullName,tu.FirstName,tu.LastName ORDER BY TutorName;",

        StudentDashboardQuery.Ratings => @"
DECLARE @UserId uniqueidentifier=(SELECT UserId FROM dbo.Student WHERE Id=@StudentId AND IsActive=1);
SELECT r.Id RatingId,r.ReferenceId,r.Topic,r.Rating,r.Feedback,r.RatedAt,r.RatedUserId TutorUserId,
 COALESCE(u.FullName,CONCAT(u.FirstName,N' ',u.LastName)) TutorName
FROM dbo.UserClassRating r JOIN dbo.[User] u ON u.Id=r.RatedUserId WHERE r.RaterId=@UserId ORDER BY r.RatedAt DESC;",

        StudentDashboardQuery.Notifications => @"
DECLARE @UserId uniqueidentifier=(SELECT UserId FROM dbo.Student WHERE Id=@StudentId AND IsActive=1);
SELECT TOP (@Take) n.Id NotificationId,n.NotificationType,nt.TypeCodeName NotificationTypeName,n.Message,nd.IsRead,
 n.SalesId,n.SalesDetailsId CourseEnrollmentId,n.ScheduleDetailsId,n.CreatedDate,nd.FromUserId
FROM dbo.NotificationDetails nd JOIN dbo.Notification n ON n.Id=nd.NotificationId
LEFT JOIN dbo.TypeGroup tg ON tg.TypeGroupName=N'NotificationType' AND tg.IsActive=1
LEFT JOIN dbo.Type_Code nt ON nt.TypeGroupId=tg.Id AND nt.TypeCodeValue=n.NotificationType AND nt.IsActive=1
WHERE nd.ToUserId=@UserId AND ISNULL(nd.IsActive,1)=1 AND ISNULL(n.IsActive,1)=1 ORDER BY n.CreatedDate DESC;",

        StudentDashboardQuery.UnreadNotificationCount => @"
DECLARE @UserId uniqueidentifier=(SELECT UserId FROM dbo.Student WHERE Id=@StudentId AND IsActive=1);
SELECT COUNT_BIG(*) UnreadNotificationCount FROM dbo.NotificationDetails nd JOIN dbo.Notification n ON n.Id=nd.NotificationId
WHERE nd.ToUserId=@UserId AND ISNULL(nd.IsRead,0)=0 AND ISNULL(nd.IsActive,1)=1 AND ISNULL(n.IsActive,1)=1;",

        StudentDashboardQuery.MessageSummary => @"
DECLARE @UserId uniqueidentifier=(SELECT UserId FROM dbo.Student WHERE Id=@StudentId AND IsActive=1);
SELECT COALESCE(SUM(CASE WHEN m.SenderId=@UserId THEN 1 ELSE 0 END),0) SentCount,
 COALESCE(SUM(CASE WHEN m.ReceiverId=@UserId THEN 1 ELSE 0 END),0) ReceivedCount,
 MAX(CASE WHEN m.SenderId=@UserId THEN m.[Timestamp] END) LastSentAt,
 MAX(CASE WHEN m.ReceiverId=@UserId THEN m.[Timestamp] END) LastReceivedAt
FROM dbo.Message m WHERE m.SenderId=@UserId OR m.ReceiverId=@UserId;",

        StudentDashboardQuery.Conversations => @"
DECLARE @UserId uniqueidentifier=(SELECT UserId FROM dbo.Student WHERE Id=@StudentId AND IsActive=1);
WITH x AS(SELECT m.*,CASE WHEN m.SenderId=@UserId THEN m.ReceiverId ELSE m.SenderId END OtherUserId,
 ROW_NUMBER() OVER(PARTITION BY CASE WHEN m.SenderId=@UserId THEN m.ReceiverId ELSE m.SenderId END ORDER BY m.[Timestamp] DESC,m.Id DESC) rn,
 COUNT(*) OVER(PARTITION BY CASE WHEN m.SenderId=@UserId THEN m.ReceiverId ELSE m.SenderId END) MessageCount
 FROM dbo.Message m WHERE m.SenderId=@UserId OR m.ReceiverId=@UserId)
SELECT x.OtherUserId,COALESCE(u.FullName,CONCAT(u.FirstName,N' ',u.LastName)) OtherUserName,x.MessageCount,
 x.Content LastMessage,x.[Timestamp] LastMessageAt,CASE WHEN x.SenderId=@UserId THEN 'Sent' ELSE 'Received' END Direction
FROM x JOIN dbo.[User] u ON u.Id=x.OtherUserId WHERE x.rn=1 ORDER BY x.[Timestamp] DESC;",

        StudentDashboardQuery.Feedback => @"
DECLARE @UserId uniqueidentifier=(SELECT UserId FROM dbo.Student WHERE Id=@StudentId AND IsActive=1);
SELECT f.Id,f.TeacherQualityRating,f.OverallExperienceRating,f.IssueTeachingMethod,f.IssuePunctuality,
 f.IssueCommunication,f.IssueTechnicalIssues,f.IssueOther,f.Comments,f.IsFlaggedForReview,f.CreatedOnUtc
FROM dbo.TctLearningExperienceFeedback f WHERE f.UserId=@UserId ORDER BY f.CreatedOnUtc DESC;",

        StudentDashboardQuery.Summary => @"
DECLARE @UserId uniqueidentifier=(SELECT UserId FROM dbo.Student WHERE Id=@StudentId AND IsActive=1);
SELECT (SELECT COUNT_BIG(*) FROM dbo.Sales sa JOIN dbo.SalesDetails sd ON sd.SalesId=sa.Id
 WHERE sa.StudentId=@StudentId AND sa.IsActive=1 AND sd.IsActive=1) ActiveCourses,
 (SELECT COUNT_BIG(*) FROM dbo.Sales sa JOIN dbo.SalesDetails sd ON sd.SalesId=sa.Id AND sd.IsActive=1
 JOIN dbo.Schedule s ON s.SalesDetailsId=sd.Id JOIN dbo.ScheduleDetails d ON d.ScheduleId=s.ScheduleId
 WHERE sa.StudentId=@StudentId AND sa.IsActive=1 AND s.IsActive=1 AND d.IsActive=1
 AND d.[Date]>=CAST(GETDATE() AS date) AND (d.TutorScheduleStatus IS NULL OR d.StudentScheduleStatus IS NULL)) UpcomingClasses,
 (SELECT COUNT_BIG(*) FROM dbo.NotificationDetails nd JOIN dbo.Notification n ON n.Id=nd.NotificationId
 WHERE nd.ToUserId=@UserId AND ISNULL(nd.IsRead,0)=0 AND ISNULL(nd.IsActive,1)=1 AND ISNULL(n.IsActive,1)=1) UnreadNotifications,
 (SELECT CAST(100.0*SUM(CASE WHEN d.IsStudentPresent=1 THEN 1 ELSE 0 END)/NULLIF(COUNT(*),0) AS decimal(5,2))
 FROM dbo.Sales sa JOIN dbo.SalesDetails sd ON sd.SalesId=sa.Id AND sd.IsActive=1
 JOIN dbo.Schedule s ON s.SalesDetailsId=sd.Id JOIN dbo.ScheduleDetails d ON d.ScheduleId=s.ScheduleId
 WHERE sa.StudentId=@StudentId AND sa.IsActive=1 AND s.IsActive=1 AND d.IsActive=1 AND d.IsStudentPresent IS NOT NULL
 AND d.[Date]<DATEADD(day,1,CAST(GETDATE() AS date))) AttendancePercent,
 -- Regular classes marked Completed - Extra Class / Prepon / Postpon (1009008-1009010) by any party; one per class.
 (SELECT COUNT_BIG(*) FROM dbo.Schedule s JOIN dbo.ScheduleDetails d ON d.ScheduleId=s.ScheduleId
 LEFT JOIN dbo.Type_Code ts ON ts.Id=d.TutorScheduleStatus
 LEFT JOIN dbo.Type_Code ss ON ss.Id=d.StudentScheduleStatus
 LEFT JOIN dbo.Type_Code os ON os.Id=d.OperationScheduleStatus
 WHERE s.StudentId=@StudentId AND s.IsActive=1 AND d.IsActive=1 AND d.ScheduleType=N'Class'
 AND MONTH(d.[Date])=MONTH(GETDATE()) AND YEAR(d.[Date])=YEAR(GETDATE())
 AND (ts.TypeCodeValue IN (1009008,1009009,1009010)
  OR ss.TypeCodeValue IN (1009008,1009009,1009010)
  OR os.TypeCodeValue IN (1009008,1009009,1009010))) CurrentMonthExtraClasses;",

        _ => throw new ArgumentOutOfRangeException(nameof(query), query, null)
    };

    private async Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> ExecuteAsync(
        string sql, Guid studentId, DateTime? fromDate, DateTime? toDate, int? take, CancellationToken token)
    {
        DbConnection connection = _dbContext.Database.GetDbConnection();
        var openedHere = connection.State != ConnectionState.Open;
        if (openedHere) await connection.OpenAsync(token);
        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = sql;
            command.CommandTimeout = 30;
            Add(command, "@StudentId", DbType.Guid, studentId);
            if (sql.Contains("@FromDate", StringComparison.Ordinal)) Add(command, "@FromDate", DbType.Date, fromDate!.Value.Date);
            if (sql.Contains("@ToDate", StringComparison.Ordinal)) Add(command, "@ToDate", DbType.Date, toDate!.Value.Date);
            if (sql.Contains("@Take", StringComparison.Ordinal)) Add(command, "@Take", DbType.Int32, take ?? 100);

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

