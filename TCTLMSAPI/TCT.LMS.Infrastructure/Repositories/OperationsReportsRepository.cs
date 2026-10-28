using System.Data;
using System.Data.Common;
using Microsoft.EntityFrameworkCore;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Data.Common;

namespace TCT.LMS.Infrastructure.Repositories;

/// <summary>
/// Read-only SQL for the Operations Reports module (Reports menu, Operations role).
/// Every report view shares the CTEs below, so totals and detail rows always use the same filters
/// and the same class classification.
/// </summary>
public sealed class OperationsReportsRepository : IOperationsReportsRepository
{
    // Class outcome classification (stored status codes; Type_Code groups 200 "Status" and 1009 "Class Status Type").
    // A class takes its outcome from the tutor, student and operations status columns:
    //   Cancelled     1009002 Class Cancelled, 1009003 Class Cancelled Student Not Available, 20015 Demo Cancelled,
    //                 20021 Class Canceled Tutor Not Available, 20036 Class Canceled Student Not Available,
    //                 20037 On spot tutor cancellation, 20038 On spot student cancellation
    //   Cancelled by  Tutor: 20021, 20037   Student: 1009003, 20036, 20038   otherwise "Not specified"
    //   Completed     1009001 / 20020 Class Completed, 1009008-1009010 Completed (Extra/Preponed/Postponed),
    //                 20041 Demo Completed, or ScheduleDetails.Status = 'Class Completed' (never when cancelled)
    //   Rescheduled   1009006 / 20023 Class Re-Scheduled, 20028 Re-Schedule Demo
    //   Reschedule requested  1009004 / 20024 Request for Re-schedule, 20029 Demo Reschedule Request, 20030 Schedule Change Request
    // Schedule.TutorId holds Tutor.Id on some schedules and the tutor's User.Id on others; both are matched.
    // Attendance "submitted" = the party's status moved past the initial scheduling codes (20003 NeedToSchedule,
    //   20004 Class Scheduled, 20018 DC Need to schedule, 20019 Demo Scheduled), which every class starts with.
    // Enrollment categories (SalesDetails.Status, group 200): Holding 20039/20040, Dropped 20005/20026/20031/20032,
    //   Active 20004/20020/20023/20024/20030, Rejected 20014, everything else Demo / pipeline.
    private const string Ctes = @"
WITH Th AS (
 SELECT
  (SELECT TOP 1 Value FROM dbo.Thresholds WHERE IsActive=1 AND ThresholdName LIKE N'LateAttendanceThreshold%' ORDER BY ModifiedDate DESC,CreatedDate DESC) LateMinutes,
  (SELECT TOP 1 Value FROM dbo.Thresholds WHERE IsActive=1 AND ThresholdName LIKE N'MinStudentsPerTutor%' ORDER BY ModifiedDate DESC,CreatedDate DESC) MinStudents,
  (SELECT TOP 1 Value FROM dbo.Thresholds WHERE IsActive=1 AND ThresholdName LIKE N'MaxStudentsPerTutor%' ORDER BY ModifiedDate DESC,CreatedDate DESC) MaxStudents,
  (SELECT TOP 1 Value FROM dbo.Thresholds WHERE IsActive=1 AND ThresholdName LIKE N'MinHoursPerWeek%' ORDER BY ModifiedDate DESC,CreatedDate DESC) MinHoursPerWeek,
  (SELECT TOP 1 Value FROM dbo.Thresholds WHERE IsActive=1 AND ThresholdName LIKE N'MaxCancellationsAllowed%' ORDER BY ModifiedDate DESC,CreatedDate DESC) MaxCancellations,
  (SELECT TOP 1 Value FROM dbo.Thresholds WHERE IsActive=1 AND ThresholdName LIKE N'CancelClassRatio%' ORDER BY ModifiedDate DESC,CreatedDate DESC) CancelRatio,
  (SELECT TOP 1 Value FROM dbo.Thresholds WHERE IsActive=1 AND ThresholdName LIKE N'LowScoreThreshold%' ORDER BY ModifiedDate DESC,CreatedDate DESC) LowScore,
  (SELECT TOP 1 Value FROM dbo.Thresholds WHERE IsActive=1 AND ThresholdName LIKE N'LowScoreRepeatCount%' ORDER BY ModifiedDate DESC,CreatedDate DESC) LowScoreRepeat
),
Cls AS (
 SELECT d.ScheduleDetailsId,CAST(d.[Date] AS date) ClassDate,d.StartTime,d.EndTime,d.ScheduleType,
  st.Id StudentId,st.Code StudentCode,COALESCE(su.FullName,CONCAT(su.FirstName,N' ',su.LastName)) StudentName,
  t.Id TutorId,tu.UserCode TutorCode,COALESCE(tu.FullName,CONCAT(tu.FirstName,N' ',tu.LastName)) TutorName,
  course.SubjectId,sub.TypeCodeName SubjectName,grade.TypeCodeName GradeName,
  ts.TypeCodeValue TutorStatusCode,ts.TypeCodeName TutorStatus,ss.TypeCodeValue StudentStatusCode,ss.TypeCodeName StudentStatus,
  os.TypeCodeValue OpsStatusCode,os.TypeCodeName OperationStatus,d.Status ClassStatus,
  d.IsTutorPresent,d.IsStudentPresent,d.TutorStartTime,d.StudentStartTime,
  NULLIF(d.TutorComment,'') TutorComment,NULLIF(d.StudentComment,'') StudentComment,NULLIF(d.Comment,'') OperationComment,
  DATEDIFF(MINUTE,d.StartTime,d.EndTime) DurationMinutes
 FROM dbo.ScheduleDetails d JOIN dbo.Schedule s ON s.ScheduleId=d.ScheduleId
 JOIN dbo.Student st ON st.Id=s.StudentId LEFT JOIN dbo.[User] su ON su.Id=st.UserId
 CROSS APPLY (SELECT TOP 1 tx.Id,tx.UserId FROM dbo.Tutor tx WHERE tx.Id=s.TutorId OR tx.UserId=s.TutorId
  ORDER BY CASE WHEN tx.Id=s.TutorId THEN 0 ELSE 1 END) t
 LEFT JOIN dbo.[User] tu ON tu.Id=t.UserId
 LEFT JOIN dbo.SalesDetails course ON course.Id=s.SalesDetailsId
 LEFT JOIN dbo.Type_Code sub ON sub.Id=course.SubjectId LEFT JOIN dbo.Type_Code grade ON grade.Id=st.GradeId
 LEFT JOIN dbo.Type_Code ts ON ts.Id=d.TutorScheduleStatus
 LEFT JOIN dbo.Type_Code ss ON ss.Id=d.StudentScheduleStatus
 LEFT JOIN dbo.Type_Code os ON os.Id=d.OperationScheduleStatus
 WHERE d.IsActive=1 AND ISNULL(s.IsActive,0)=1
  AND d.[Date]>=@FromDate AND d.[Date]<DATEADD(day,1,@ToDate)
  AND (@TutorId IS NULL OR t.Id=@TutorId) AND (@StudentId IS NULL OR st.Id=@StudentId)
  AND (@SubjectId IS NULL OR course.SubjectId=@SubjectId)
  AND (@ClassSearch IS NULL OR su.FullName LIKE @ClassSearchLike OR CONCAT(su.FirstName,N' ',su.LastName) LIKE @ClassSearchLike
   OR st.Code LIKE @ClassSearchLike OR tu.FullName LIKE @ClassSearchLike OR CONCAT(tu.FirstName,N' ',tu.LastName) LIKE @ClassSearchLike
   OR sub.TypeCodeName LIKE @ClassSearchLike)
),
C AS (
 SELECT c.*,th.LateMinutes,th.MinStudents,th.MaxStudents,th.MinHoursPerWeek,th.MaxCancellations,th.CancelRatio,
  f.IsCancelled,f.TutorCancelFlag,f.StudentCancelFlag,f.AnyCompleted,f.IsRescheduled,f.RescheduleRequested,
  CASE WHEN c.StartTime IS NOT NULL AND c.TutorStartTime IS NOT NULL
   THEN DATEDIFF(MINUTE,CAST(c.StartTime AS time),CAST(c.TutorStartTime AS time)) END TutorLateMinutes,
  CASE WHEN c.StartTime IS NOT NULL AND c.StudentStartTime IS NOT NULL
   THEN DATEDIFF(MINUTE,CAST(c.StartTime AS time),CAST(c.StudentStartTime AS time)) END StudentLateMinutes
 FROM Cls c CROSS JOIN Th th
 CROSS APPLY (SELECT
   MAX(CASE WHEN v IN (1009002,1009003,20015,20021,20036,20037,20038) THEN 1 ELSE 0 END) IsCancelled,
   MAX(CASE WHEN v IN (20021,20037) THEN 1 ELSE 0 END) TutorCancelFlag,
   MAX(CASE WHEN v IN (1009003,20036,20038) THEN 1 ELSE 0 END) StudentCancelFlag,
   MAX(CASE WHEN v IN (1009001,20020,1009008,1009009,1009010,20041) THEN 1 ELSE 0 END) AnyCompleted,
   MAX(CASE WHEN v IN (1009006,20023,20028) THEN 1 ELSE 0 END) IsRescheduled,
   MAX(CASE WHEN v IN (1009004,20024,20029,20030) THEN 1 ELSE 0 END) RescheduleRequested
  FROM (VALUES (c.TutorStatusCode),(c.StudentStatusCode),(c.OpsStatusCode)) codes(v)) f
),
D AS (
 SELECT C.*,
  CASE WHEN IsCancelled=1 THEN N'Cancelled'
   WHEN AnyCompleted=1 OR ClassStatus=N'Class Completed' THEN N'Completed'
   WHEN IsRescheduled=1 THEN N'Rescheduled'
   WHEN RescheduleRequested=1 THEN N'Reschedule requested'
   WHEN ClassDate<CAST(GETDATE() AS date) THEN N'Not updated'
   ELSE N'Upcoming' END Outcome,
  CASE WHEN TutorCancelFlag=1 THEN N'Tutor' WHEN StudentCancelFlag=1 THEN N'Student'
   WHEN IsCancelled=1 THEN N'Not specified' END CancelledBy,
  CASE WHEN IsCancelled=0 AND IsRescheduled=0 AND ClassDate<CAST(GETDATE() AS date) THEN 1 ELSE 0 END Due,
  CASE @GroupBy WHEN N'month' THEN DATEFROMPARTS(YEAR(ClassDate),MONTH(ClassDate),1)
   WHEN N'week' THEN DATEADD(day,-((DATEPART(weekday,ClassDate)+@@DATEFIRST+5)%7),ClassDate)
   ELSE ClassDate END PeriodStart
 FROM C
),
K AS (
 SELECT D.*,
  CASE WHEN Due=1 AND ISNULL(StudentStatusCode,20004) NOT IN (20003,20004,20018,20019) THEN 1 ELSE 0 END StudentSubmitted,
  CASE WHEN Due=1 AND ISNULL(TutorStatusCode,20004) NOT IN (20003,20004,20018,20019) THEN 1 ELSE 0 END TutorSubmitted,
  CASE WHEN Due=1 AND ISNULL(StudentStatusCode,20004) IN (20003,20004,20018,20019) THEN 1 ELSE 0 END StudentMissing,
  CASE WHEN Due=1 AND ISNULL(TutorStatusCode,20004) IN (20003,20004,20018,20019) THEN 1 ELSE 0 END TutorMissing,
  CASE WHEN IsCancelled=0 AND IsStudentPresent=0 THEN 1 ELSE 0 END StudentAbsent,
  CASE WHEN IsCancelled=0 AND IsTutorPresent=0 THEN 1 ELSE 0 END TutorAbsent,
  CASE WHEN Due=1 AND ISNULL(StudentStatusCode,20004) NOT IN (20003,20004,20018,20019) AND ISNULL(IsStudentPresent,1)=1 THEN 1 ELSE 0 END StudentAttended,
  CASE WHEN TutorLateMinutes>LateMinutes THEN 1 ELSE 0 END TutorLate,
  CASE WHEN StudentLateMinutes>LateMinutes THEN 1 ELSE 0 END StudentLate
 FROM D
),
E AS (
 SELECT sd.Id SalesDetailsId,sd.CreatedDate,s.StudentId,st.Code StudentCode,
  COALESCE(su.FullName,CONCAT(su.FirstName,N' ',su.LastName)) StudentName,sd.SubjectId,sub.TypeCodeName CourseName,
  tt.Id TutorId,COALESCE(tu.FullName,CONCAT(tu.FirstName,N' ',tu.LastName)) TutorName,
  tc.TypeCodeValue StatusCode,tc.TypeCodeName StatusName,
  CASE WHEN tc.TypeCodeValue IN (20039,20040) THEN N'Holding'
   WHEN tc.TypeCodeValue IN (20005,20026,20031,20032) THEN N'Dropped'
   WHEN tc.TypeCodeValue IN (20004,20020,20023,20024,20030) THEN N'Active'
   WHEN tc.TypeCodeValue=20014 THEN N'Rejected'
   ELSE N'Demo / pipeline' END Category
 FROM dbo.SalesDetails sd JOIN dbo.Sales s ON s.Id=sd.SalesId AND s.IsActive=1
 LEFT JOIN dbo.Student st ON st.Id=s.StudentId LEFT JOIN dbo.[User] su ON su.Id=st.UserId
 LEFT JOIN dbo.Type_Code sub ON sub.Id=sd.SubjectId LEFT JOIN dbo.Type_Code tc ON tc.Id=sd.Status
 LEFT JOIN dbo.[User] tu ON tu.Id=sd.TutorId LEFT JOIN dbo.Tutor tt ON tt.UserId=sd.TutorId
 WHERE sd.IsActive=1 AND sd.CreatedDate>=@FromDate AND sd.CreatedDate<DATEADD(day,1,@ToDate)
  AND (@TutorId IS NULL OR tt.Id=@TutorId) AND (@StudentId IS NULL OR s.StudentId=@StudentId)
  AND (@SubjectId IS NULL OR sd.SubjectId=@SubjectId)
  AND (@ClassSearch IS NULL OR su.FullName LIKE @ClassSearchLike OR st.Code LIKE @ClassSearchLike
   OR sub.TypeCodeName LIKE @ClassSearchLike OR tu.FullName LIKE @ClassSearchLike)
),
TT AS (
 SELECT x.TestScheduleId,CAST(x.ExamDate AS date) ExamDate,x.ExamStartTime,st.Id StudentId,st.Code StudentCode,
  COALESCE(su.FullName,CONCAT(su.FirstName,N' ',su.LastName)) StudentName,
  t.Id TutorId,COALESCE(tu.FullName,CONCAT(tu.FirstName,N' ',tu.LastName)) TutorName,x.SubjectId,sub.TypeCodeName SubjectName,
  a.AnswerSheetSubmissionId,a.SubmittedOn,a.EvaluationStatus,a.MarksObtained,a.MaxMarks,
  CAST(CASE WHEN a.EvaluationStatus=N'Evaluated' AND a.MaxMarks>0 THEN 100.0*a.MarksObtained/a.MaxMarks END AS decimal(6,2)) ScorePct
 FROM dbo.TestSchedule x JOIN dbo.Student st ON st.Id=x.StudentId LEFT JOIN dbo.[User] su ON su.Id=st.UserId
 JOIN dbo.Tutor t ON t.Id=x.TutorId LEFT JOIN dbo.[User] tu ON tu.Id=t.UserId
 LEFT JOIN dbo.Type_Code sub ON sub.Id=x.SubjectId
 OUTER APPLY (SELECT TOP 1 y.AnswerSheetSubmissionId,y.SubmittedOn,y.EvaluationStatus,y.MarksObtained,y.MaxMarks
  FROM dbo.AnswerSheetSubmission y WHERE y.TestScheduleId=x.TestScheduleId AND y.StudentId=x.StudentId AND ISNULL(y.IsActive,1)=1
  ORDER BY y.SubmittedOn DESC) a
 WHERE x.IsActive=1 AND x.ExamDate>=@FromDate AND x.ExamDate<DATEADD(day,1,@ToDate)
  AND (@TutorId IS NULL OR t.Id=@TutorId) AND (@StudentId IS NULL OR st.Id=@StudentId)
  AND (@SubjectId IS NULL OR x.SubjectId=@SubjectId)
  AND (@ClassSearch IS NULL OR su.FullName LIKE @ClassSearchLike OR st.Code LIKE @ClassSearchLike
   OR tu.FullName LIKE @ClassSearchLike OR sub.TypeCodeName LIKE @ClassSearchLike)
)";

    private const string TutorName = "COALESCE(u.FullName,CONCAT(u.FirstName,N' ',u.LastName))";
    private const string LatestClassNote = @"OUTER APPLY (SELECT TOP 1 n.NoteText FROM dbo.TCTNotes n
  WHERE n.ReferenceId=K.ScheduleDetailsId AND ISNULL(n.IsActive,1)=1 ORDER BY n.CreatedDate DESC) note";
    private const string ClassNoteColumn = "COALESCE(note.NoteText,K.TutorComment,K.StudentComment,K.OperationComment) LatestNote";

    private sealed record ViewDef(string Body, string DefaultSort, bool DefaultDesc, string TieBreak, bool ClassSearch, string[] SortColumns);

    private static readonly Dictionary<string, ViewDef> Views = new(StringComparer.OrdinalIgnoreCase)
    {
        // ── A. Attendance ────────────────────────────────────────────────────
        ["attendance/sessions"] = new(@"
SELECT ScheduleDetailsId,ClassDate,StartTime,EndTime,ScheduleType,StudentId,StudentCode,StudentName,TutorId,TutorName,SubjectName,
 StudentStatus,TutorStatus,IsStudentPresent,IsTutorPresent,StudentLateMinutes,TutorLateMinutes,
 StudentMissing,TutorMissing,StudentAbsent,TutorAbsent,StudentLate,TutorLate,Outcome
FROM K
WHERE @Status IS NULL OR (@Status=N'student-missing' AND StudentMissing=1) OR (@Status=N'tutor-missing' AND TutorMissing=1)
 OR (@Status=N'student-absent' AND StudentAbsent=1) OR (@Status=N'tutor-absent' AND TutorAbsent=1)
 OR (@Status=N'late' AND (TutorLate=1 OR StudentLate=1))",
            "ClassDate", true, "ScheduleDetailsId", true,
            new[] { "ClassDate", "StartTime", "StudentName", "TutorName", "SubjectName", "StudentStatus", "TutorStatus", "TutorLateMinutes", "Outcome" }),

        ["attendance/periods"] = new(@"
SELECT PeriodStart,COUNT_BIG(*) Scheduled,SUM(IsCancelled) Cancelled,SUM(Due) Due,
 SUM(StudentSubmitted) StudentSubmitted,SUM(TutorSubmitted) TutorSubmitted,SUM(StudentMissing) StudentMissing,
 SUM(TutorMissing) TutorMissing,SUM(StudentAbsent) StudentAbsent,SUM(TutorAbsent) TutorAbsent,SUM(StudentAttended) StudentAttended,
 CAST(100.0*SUM(StudentAttended)/NULLIF(SUM(Due),0) AS decimal(5,2)) StudentAttendancePct,
 CAST(100.0*SUM(TutorSubmitted)/NULLIF(SUM(Due),0) AS decimal(5,2)) TutorCompliancePct
FROM K GROUP BY PeriodStart",
            "PeriodStart", true, "PeriodStart", true,
            new[] { "PeriodStart", "Scheduled", "Due", "StudentAttendancePct", "TutorCompliancePct", "StudentMissing", "TutorMissing" }),

        ["attendance/tutors"] = new(@"
SELECT TutorId,TutorCode,TutorName,COUNT_BIG(*) Classes,SUM(Due) Due,SUM(TutorSubmitted) Submitted,SUM(TutorMissing) Missing,
 SUM(TutorAbsent) Absent,SUM(TutorLate) Late,CAST(100.0*SUM(TutorSubmitted)/NULLIF(SUM(Due),0) AS decimal(5,2)) CompliancePct
FROM K GROUP BY TutorId,TutorCode,TutorName
HAVING @Status IS NULL OR (@Status=N'non-compliant' AND (SUM(TutorMissing)>0 OR SUM(TutorAbsent)>0 OR SUM(TutorLate)>0))",
            "CompliancePct", false, "TutorId", true,
            new[] { "TutorName", "Classes", "Due", "Submitted", "Missing", "Absent", "Late", "CompliancePct" }),

        // ── B. Class completion ──────────────────────────────────────────────
        ["completion/daily"] = new(@"
SELECT ClassDate,COUNT_BIG(*) Scheduled,
 SUM(CASE WHEN Outcome=N'Completed' THEN 1 ELSE 0 END) Completed,SUM(IsCancelled) Cancelled,
 SUM(CASE WHEN Outcome=N'Rescheduled' THEN 1 ELSE 0 END) Rescheduled,
 SUM(CASE WHEN Outcome=N'Reschedule requested' THEN 1 ELSE 0 END) RescheduleRequested,
 SUM(CASE WHEN Outcome=N'Not updated' THEN 1 ELSE 0 END) NotUpdated,
 SUM(CASE WHEN Outcome=N'Upcoming' THEN 1 ELSE 0 END) Upcoming,
 CAST(100.0*SUM(CASE WHEN Outcome=N'Completed' THEN 1 ELSE 0 END)/NULLIF(COUNT_BIG(*),0) AS decimal(5,2)) CompletionPct
FROM K GROUP BY ClassDate",
            "ClassDate", true, "ClassDate", true,
            new[] { "ClassDate", "Scheduled", "Completed", "Cancelled", "Rescheduled", "NotUpdated", "CompletionPct" }),

        ["completion/classes"] = new($@"
SELECT K.ScheduleDetailsId,K.ClassDate,K.StartTime,K.EndTime,K.ScheduleType,K.StudentId,K.StudentCode,K.StudentName,
 K.TutorId,K.TutorName,K.SubjectName,K.TutorStatus,K.StudentStatus,K.OperationStatus,K.Outcome,K.CancelledBy,{ClassNoteColumn}
FROM K {LatestClassNote}
WHERE @Status IS NULL OR K.Outcome=@Status",
            "ClassDate", true, "ScheduleDetailsId", true,
            new[] { "ClassDate", "StartTime", "StudentName", "TutorName", "SubjectName", "Outcome", "CancelledBy" }),

        // ── C. Tutor performance ─────────────────────────────────────────────
        ["tutors/performance"] = new($@"
SELECT * FROM (
 SELECT t.Id TutorId,u.UserCode TutorCode,{TutorName} TutorName,u.JoiningDate,
  ISNULL(alloc.AllocatedStudents,0) AllocatedStudents,ISNULL(cls.Classes,0) Classes,ISNULL(cls.Completed,0) Completed,
  ISNULL(cls.TutorCancellations,0) TutorCancellations,ISNULL(cls.Cancellations,0) Cancellations,
  CAST(100.0*cls.Cancellations/NULLIF(cls.Classes,0) AS decimal(5,2)) CancellationPct,
  CAST(ISNULL(cls.CompletedMinutes,0)/60.0 AS decimal(10,2)) CompletedHours,
  CAST(ISNULL(cls.CompletedMinutes,0)/60.0/((DATEDIFF(day,@FromDate,@ToDate)+1)/7.0) AS decimal(10,2)) AvgWeeklyHours,
  rating.AverageRating,ISNULL(rating.RatingCount,0) RatingCount,ISNULL(dropped.Dropouts,0) Dropouts,
  ISNULL(tests.TestsScheduled,0) TestsScheduled,ISNULL(tests.TestsEvaluated,0) TestsEvaluated,
  early.StudentsFirstThreeMonths,
  CASE WHEN u.JoiningDate IS NULL THEN NULL WHEN early.StudentsFirstThreeMonths<=5 THEN N'Low' ELSE N'High' END Engagement,
  CASE WHEN ISNULL(alloc.AllocatedStudents,0)<th.MinStudents THEN 1 ELSE 0 END BelowMinStudents,
  CASE WHEN ISNULL(alloc.AllocatedStudents,0)>th.MaxStudents THEN 1 ELSE 0 END AboveMaxStudents,
  CASE WHEN ISNULL(cls.TutorCancellations,0)>th.MaxCancellations THEN 1 ELSE 0 END OverCancellationLimit,
  CASE WHEN ISNULL(cls.CompletedMinutes,0)/60.0/((DATEDIFF(day,@FromDate,@ToDate)+1)/7.0)<th.MinHoursPerWeek THEN 1 ELSE 0 END BelowMinWeeklyHours
 FROM dbo.Tutor t JOIN dbo.[User] u ON u.Id=t.UserId CROSS JOIN Th th
 OUTER APPLY (SELECT COUNT(DISTINCT a.StudentId) AllocatedStudents FROM dbo.TutorStudentAllocations a
  WHERE a.TutorId=t.Id AND ISNULL(a.IsActive,0)=1) alloc
 OUTER APPLY (SELECT COUNT_BIG(*) Classes,SUM(CASE WHEN k.Outcome=N'Completed' THEN 1 ELSE 0 END) Completed,
  SUM(k.TutorCancelFlag) TutorCancellations,SUM(k.IsCancelled) Cancellations,
  SUM(CASE WHEN k.Outcome=N'Completed' THEN ISNULL(k.DurationMinutes,0) ELSE 0 END) CompletedMinutes
  FROM K k WHERE k.TutorId=t.Id) cls
 OUTER APPLY (SELECT CAST(AVG(CONVERT(decimal(10,2),r.Rating)) AS decimal(5,2)) AverageRating,COUNT_BIG(*) RatingCount
  FROM dbo.UserClassRating r WHERE r.RatedUserId=u.Id AND r.RatedAt>=@FromDate AND r.RatedAt<DATEADD(day,1,@ToDate)) rating
 OUTER APPLY (SELECT COUNT_BIG(*) Dropouts FROM dbo.SalesDetails sd JOIN dbo.Type_Code dc ON dc.Id=sd.Status
  WHERE sd.TutorId=u.Id AND sd.IsActive=1 AND dc.TypeCodeValue IN (20005,20026,20031,20032)) dropped
 OUTER APPLY (SELECT COUNT_BIG(*) TestsScheduled,SUM(CASE WHEN x.EvaluationStatus=N'Evaluated' THEN 1 ELSE 0 END) TestsEvaluated
  FROM TT x WHERE x.TutorId=t.Id) tests
 OUTER APPLY (SELECT COUNT(DISTINCT a.StudentId) StudentsFirstThreeMonths FROM dbo.TutorStudentAllocations a
  WHERE a.TutorId=t.Id AND ISNULL(a.IsActive,0)=1 AND a.CreatedDate>=u.JoiningDate AND a.CreatedDate<DATEADD(month,3,u.JoiningDate)) early
 WHERE t.IsActive=1 AND ISNULL(u.IsActive,0)=1 AND (@TutorId IS NULL OR t.Id=@TutorId)
  AND (@Search IS NULL OR u.FullName LIKE @SearchLike OR CONCAT(u.FirstName,N' ',u.LastName) LIKE @SearchLike OR u.UserCode LIKE @SearchLike)
) p
WHERE @Status IS NULL OR (@Status=N'low' AND Engagement=N'Low') OR (@Status=N'high' AND Engagement=N'High')
 OR (@Status=N'threshold' AND (BelowMinStudents=1 OR AboveMaxStudents=1 OR OverCancellationLimit=1 OR BelowMinWeeklyHours=1))",
            "TutorName", false, "TutorId", false,
            new[] { "TutorName", "AllocatedStudents", "Classes", "Completed", "TutorCancellations", "CancellationPct", "AvgWeeklyHours", "AverageRating", "Dropouts", "Engagement" }),

        ["tutors/ratings"] = new(RatingsBody, "RatedAt", true, "RatingId", false,
            new[] { "RatedAt", "TutorName", "RaterRole", "Rating", "Topic" }),

        // ── D. Enrollment ────────────────────────────────────────────────────
        ["enrollment/courses"] = new(@"
SELECT SubjectId,ISNULL(CourseName,N'Not set') CourseName,COUNT(DISTINCT StudentId) EnrolledStudents,COUNT_BIG(*) Enrollments,
 SUM(CASE WHEN Category=N'Active' THEN 1 ELSE 0 END) Active,SUM(CASE WHEN Category=N'Holding' THEN 1 ELSE 0 END) Holding,
 SUM(CASE WHEN Category=N'Dropped' THEN 1 ELSE 0 END) Dropped,SUM(CASE WHEN Category=N'Demo / pipeline' THEN 1 ELSE 0 END) Pipeline,
 SUM(CASE WHEN Category=N'Rejected' THEN 1 ELSE 0 END) Rejected
FROM E GROUP BY SubjectId,CourseName",
            "EnrolledStudents", true, "CourseName", true,
            new[] { "CourseName", "EnrolledStudents", "Enrollments", "Active", "Holding", "Dropped", "Pipeline" }),

        ["enrollment/trend"] = new(@"
SELECT DATEFROMPARTS(YEAR(CreatedDate),MONTH(CreatedDate),1) EnrollmentMonth,
 COUNT(DISTINCT CONCAT(CONVERT(varchar(36),StudentId),'|',CONVERT(varchar(36),SubjectId))) NewStudentCourseEnrollments,
 COUNT(DISTINCT StudentId) DistinctStudents
FROM E GROUP BY DATEFROMPARTS(YEAR(CreatedDate),MONTH(CreatedDate),1)",
            "EnrollmentMonth", false, "EnrollmentMonth", true,
            new[] { "EnrollmentMonth", "NewStudentCourseEnrollments", "DistinctStudents" }),

        ["enrollment/tutors"] = new($@"
SELECT * FROM (
 SELECT t.Id TutorId,u.UserCode TutorCode,{TutorName} TutorName,ISNULL(alloc.Students,0) Students,ISNULL(alloc.Subjects,0) Subjects,
  th.MinStudents,th.MaxStudents,
  CASE WHEN ISNULL(alloc.Students,0)<th.MinStudents THEN N'Below minimum' WHEN ISNULL(alloc.Students,0)>th.MaxStudents THEN N'Above maximum'
   ELSE N'Within range' END Balance
 FROM dbo.Tutor t JOIN dbo.[User] u ON u.Id=t.UserId CROSS JOIN Th th
 OUTER APPLY (SELECT COUNT(DISTINCT a.StudentId) Students,COUNT(DISTINCT sd.SubjectId) Subjects
  FROM dbo.TutorStudentAllocations a LEFT JOIN dbo.SalesDetails sd ON sd.Id=a.SalesDetailsId
  WHERE a.TutorId=t.Id AND ISNULL(a.IsActive,0)=1) alloc
 WHERE t.IsActive=1 AND ISNULL(u.IsActive,0)=1 AND (@TutorId IS NULL OR t.Id=@TutorId)
  AND (@Search IS NULL OR u.FullName LIKE @SearchLike OR CONCAT(u.FirstName,N' ',u.LastName) LIKE @SearchLike OR u.UserCode LIKE @SearchLike)
) p
WHERE @Status IS NULL OR Balance=@Status",
            "Students", true, "TutorId", false,
            new[] { "TutorName", "Students", "Subjects", "Balance" }),

        ["enrollment/records"] = new(@"
SELECT SalesDetailsId,CreatedDate,StudentId,StudentCode,StudentName,ISNULL(CourseName,N'Not set') CourseName,TutorName,StatusName,Category
FROM E WHERE @Status IS NULL OR Category=@Status",
            "CreatedDate", true, "SalesDetailsId", true,
            new[] { "CreatedDate", "StudentName", "CourseName", "TutorName", "StatusName", "Category" }),

        // ── E. Assignment & exam performance ─────────────────────────────────
        ["assessments/tests"] = new(@"
SELECT * FROM (
 SELECT x.TestScheduleId,x.ExamDate,x.ExamStartTime,x.StudentId,x.StudentCode,x.StudentName,x.TutorId,x.TutorName,x.SubjectName,
  CASE WHEN x.AnswerSheetSubmissionId IS NULL THEN N'Not submitted' ELSE N'Submitted' END SubmissionStatus,
  x.SubmittedOn,x.EvaluationStatus,x.MarksObtained,x.MaxMarks,x.ScorePct,
  CASE WHEN x.ScorePct IS NULL THEN N'Not graded' WHEN x.ScorePct<th.LowScore THEN N'Need Attention' ELSE N'Good' END Performance
 FROM TT x CROSS JOIN Th th
) p
WHERE @Status IS NULL OR Performance=@Status OR SubmissionStatus=@Status",
            "ExamDate", true, "TestScheduleId", true,
            new[] { "ExamDate", "StudentName", "TutorName", "SubjectName", "SubmissionStatus", "EvaluationStatus", "ScorePct", "Performance" }),

        ["assessments/students"] = new(@"
SELECT * FROM (
 SELECT x.StudentId,MAX(x.StudentCode) StudentCode,MAX(x.StudentName) StudentName,COUNT_BIG(*) Tests,
  SUM(CASE WHEN x.AnswerSheetSubmissionId IS NOT NULL THEN 1 ELSE 0 END) Submitted,
  SUM(CASE WHEN x.EvaluationStatus=N'Evaluated' THEN 1 ELSE 0 END) Evaluated,
  CAST(AVG(x.ScorePct) AS decimal(6,2)) AvgScorePct,
  SUM(CASE WHEN x.ScorePct<th.LowScore THEN 1 ELSE 0 END) LowScores,
  MAX(att.Due) ClassesDue,MAX(att.Attended) ClassesAttended,
  CAST(100.0*MAX(att.Attended)/NULLIF(MAX(att.Due),0) AS decimal(5,2)) AttendancePct,
  CASE WHEN SUM(CASE WHEN x.EvaluationStatus=N'Evaluated' THEN 1 ELSE 0 END)=0 THEN N'Not graded'
   WHEN SUM(CASE WHEN x.ScorePct<th.LowScore THEN 1 ELSE 0 END)>=MAX(th.LowScoreRepeat) OR AVG(x.ScorePct)<MAX(th.LowScore) THEN N'Need Attention'
   ELSE N'Good' END Performance
 FROM TT x CROSS JOIN Th th
 OUTER APPLY (SELECT SUM(k.Due) Due,SUM(k.StudentAttended) Attended FROM K k WHERE k.StudentId=x.StudentId) att
 GROUP BY x.StudentId
) p
WHERE @Status IS NULL OR Performance=@Status",
            "StudentName", false, "StudentId", true,
            new[] { "StudentName", "Tests", "Submitted", "Evaluated", "AvgScorePct", "LowScores", "AttendancePct", "Performance" }),

        // ── F. Student progress ──────────────────────────────────────────────
        ["progress/students"] = new(@"
SELECT * FROM (
 SELECT st.Id StudentId,st.Code StudentCode,COALESCE(u.FullName,CONCAT(u.FirstName,N' ',u.LastName)) StudentName,
  board.TypeCodeName BoardName,grade.TypeCodeName GradeName,
  ISNULL(k.Classes,0) Classes,ISNULL(k.Completed,0) Completed,ISNULL(k.StudentCancellations,0) StudentCancellations,
  ISNULL(k.Due,0) ClassesDue,ISNULL(k.Attended,0) ClassesAttended,ISNULL(k.Absent,0) Absent,ISNULL(k.Missing,0) AttendanceMissing,
  CAST(100.0*k.Attended/NULLIF(k.Due,0) AS decimal(5,2)) AttendancePct,k.LastClassDate,
  ISNULL(tests.Evaluated,0) TestsEvaluated,tests.AvgScorePct,enr.Statuses
 FROM dbo.Student st JOIN dbo.[User] u ON u.Id=st.UserId
 LEFT JOIN dbo.Type_Code board ON board.Id=st.BoardId LEFT JOIN dbo.Type_Code grade ON grade.Id=st.GradeId
 OUTER APPLY (SELECT COUNT_BIG(*) Classes,SUM(CASE WHEN x.Outcome=N'Completed' THEN 1 ELSE 0 END) Completed,
  SUM(x.StudentCancelFlag) StudentCancellations,SUM(x.Due) Due,SUM(x.StudentAttended) Attended,SUM(x.StudentAbsent) Absent,
  SUM(x.StudentMissing) Missing,MAX(CASE WHEN x.Outcome=N'Completed' THEN x.ClassDate END) LastClassDate
  FROM K x WHERE x.StudentId=st.Id) k
 OUTER APPLY (SELECT SUM(CASE WHEN y.EvaluationStatus=N'Evaluated' THEN 1 ELSE 0 END) Evaluated,CAST(AVG(y.ScorePct) AS decimal(6,2)) AvgScorePct
  FROM TT y WHERE y.StudentId=st.Id) tests
 OUTER APPLY (SELECT STRING_AGG(z.StatusName,N', ') Statuses FROM (SELECT DISTINCT tc.TypeCodeName StatusName
  FROM dbo.SalesDetails sd JOIN dbo.Sales s ON s.Id=sd.SalesId AND s.IsActive=1 LEFT JOIN dbo.Type_Code tc ON tc.Id=sd.Status
  WHERE s.StudentId=st.Id AND sd.IsActive=1 AND tc.TypeCodeName IS NOT NULL) z) enr
 WHERE st.IsActive=1 AND ISNULL(u.IsActive,0)=1 AND (@StudentId IS NULL OR st.Id=@StudentId)
  AND (@Search IS NULL OR u.FullName LIKE @SearchLike OR CONCAT(u.FirstName,N' ',u.LastName) LIKE @SearchLike OR st.Code LIKE @SearchLike)
  AND ((@TutorId IS NULL AND @SubjectId IS NULL) OR ISNULL(k.Classes,0)>0)
) p
WHERE @Status IS NULL OR (@Status=N'with-classes' AND Classes>0) OR (@Status=N'no-classes' AND Classes=0)",
            "StudentName", false, "StudentId", false,
            new[] { "StudentName", "Classes", "Completed", "StudentCancellations", "AttendancePct", "LastClassDate", "TestsEvaluated", "AvgScorePct" }),

        ["progress/holds"] = new(@"
SELECT * FROM (
 SELECT sd.Id SalesDetailsId,s.StudentId,st.Code StudentCode,COALESCE(su.FullName,CONCAT(su.FirstName,N' ',su.LastName)) StudentName,
  sub.TypeCodeName CourseName,COALESCE(tu.FullName,CONCAT(tu.FirstName,N' ',tu.LastName)) TutorName,tc.TypeCodeName StatusName,
  CASE WHEN tc.TypeCodeValue IN (20039,20040) THEN N'Holding' WHEN tc.TypeCodeValue=20026 THEN N'Tutor changed' ELSE N'Dropped' END Category,
  COALESCE(sd.ModifiedDate,sd.CreatedDate) StatusSince,DATEDIFF(day,COALESCE(sd.ModifiedDate,sd.CreatedDate),GETDATE()) DaysInStatus,
  note.NoteText LatestNote
 FROM dbo.SalesDetails sd JOIN dbo.Sales s ON s.Id=sd.SalesId AND s.IsActive=1
 LEFT JOIN dbo.Student st ON st.Id=s.StudentId LEFT JOIN dbo.[User] su ON su.Id=st.UserId
 LEFT JOIN dbo.Type_Code sub ON sub.Id=sd.SubjectId JOIN dbo.Type_Code tc ON tc.Id=sd.Status
 LEFT JOIN dbo.[User] tu ON tu.Id=sd.TutorId LEFT JOIN dbo.Tutor tt ON tt.UserId=sd.TutorId
 OUTER APPLY (SELECT TOP 1 n.NoteText FROM dbo.TCTNotes n WHERE n.ReferenceId=sd.Id AND ISNULL(n.IsActive,1)=1 ORDER BY n.CreatedDate DESC) note
 WHERE sd.IsActive=1 AND tc.TypeCodeValue IN (20039,20040,20005,20026,20031,20032)
  AND COALESCE(sd.ModifiedDate,sd.CreatedDate)>=@FromDate AND COALESCE(sd.ModifiedDate,sd.CreatedDate)<DATEADD(day,1,@ToDate)
  AND (@TutorId IS NULL OR tt.Id=@TutorId) AND (@StudentId IS NULL OR s.StudentId=@StudentId) AND (@SubjectId IS NULL OR sd.SubjectId=@SubjectId)
  AND (@Search IS NULL OR su.FullName LIKE @SearchLike OR st.Code LIKE @SearchLike OR sub.TypeCodeName LIKE @SearchLike)
) p
WHERE @Status IS NULL OR Category=@Status",
            "StatusSince", true, "SalesDetailsId", false,
            new[] { "StatusSince", "StudentName", "CourseName", "TutorName", "StatusName", "Category", "DaysInStatus" }),

        // ── G. Feedback & support ────────────────────────────────────────────
        ["feedback/ratings"] = new(RatingsBody, "RatedAt", true, "RatingId", false,
            new[] { "RatedAt", "TutorName", "RaterRole", "Rating", "Topic" }),

        ["feedback/experience"] = new(@"
SELECT f.Id FeedbackId,f.CreatedOnUtc,COALESCE(u.FullName,CONCAT(u.FirstName,N' ',u.LastName)) SubmittedBy,role.RoleName SubmittedByRole,
 f.TeacherQualityRating,f.OverallExperienceRating,
 NULLIF(CONCAT_WS(N', ',CASE WHEN f.IssueTeachingMethod=1 THEN N'Teaching method' END,CASE WHEN f.IssuePunctuality=1 THEN N'Punctuality' END,
  CASE WHEN f.IssueCommunication=1 THEN N'Communication' END,CASE WHEN f.IssueTechnicalIssues=1 THEN N'Technical issues' END,
  CASE WHEN f.IssueOther=1 THEN N'Other' END),N'') Issues,
 f.Comments,f.IsFlaggedForReview
FROM dbo.TctLearningExperienceFeedback f LEFT JOIN dbo.[User] u ON u.Id=f.UserId
OUTER APPLY (SELECT TOP 1 ro.RoleName FROM dbo.UserRole ur JOIN dbo.Roles ro ON ro.Id=ur.RoleId WHERE ur.UserId=f.UserId) role
WHERE f.CreatedOnUtc>=@FromDate AND f.CreatedOnUtc<DATEADD(day,1,@ToDate)
 AND (@Search IS NULL OR u.FullName LIKE @SearchLike OR f.Comments LIKE @SearchLike)
 AND (@Status IS NULL OR (@Status=N'flagged' AND f.IsFlaggedForReview=1)
  OR (@Status=N'issues' AND (f.IssueTeachingMethod=1 OR f.IssuePunctuality=1 OR f.IssueCommunication=1 OR f.IssueTechnicalIssues=1 OR f.IssueOther=1)))",
            "CreatedOnUtc", true, "FeedbackId", false,
            new[] { "CreatedOnUtc", "SubmittedBy", "TeacherQualityRating", "OverallExperienceRating", "IsFlaggedForReview" }),

        // ── H. PTM (no PTM records exist; tutor changes only) ───────────────
        ["ptm/tutor-changes"] = new(@"
SELECT sd.Id SalesDetailsId,COALESCE(sd.ModifiedDate,sd.CreatedDate) ChangedOn,s.StudentId,st.Code StudentCode,
 COALESCE(su.FullName,CONCAT(su.FirstName,N' ',su.LastName)) StudentName,sub.TypeCodeName CourseName,
 COALESCE(tu.FullName,CONCAT(tu.FirstName,N' ',tu.LastName)) CurrentTutor,tc.TypeCodeName StatusName,note.NoteText Note
FROM dbo.SalesDetails sd JOIN dbo.Sales s ON s.Id=sd.SalesId AND s.IsActive=1
LEFT JOIN dbo.Student st ON st.Id=s.StudentId LEFT JOIN dbo.[User] su ON su.Id=st.UserId
LEFT JOIN dbo.Type_Code sub ON sub.Id=sd.SubjectId LEFT JOIN dbo.Type_Code tc ON tc.Id=sd.Status
LEFT JOIN dbo.[User] tu ON tu.Id=sd.TutorId LEFT JOIN dbo.Tutor tt ON tt.UserId=sd.TutorId
OUTER APPLY (SELECT TOP 1 n.NoteText FROM dbo.TCTNotes n LEFT JOIN dbo.Type_Code nt ON nt.Id=n.ReferenceTypeId
 WHERE n.ReferenceId=sd.Id AND ISNULL(n.IsActive,1)=1 AND nt.TypeCodeName LIKE N'%Tutor Change%' ORDER BY n.CreatedDate DESC) note
WHERE sd.IsActive=1 AND (tc.TypeCodeValue=20026 OR note.NoteText IS NOT NULL)
 AND COALESCE(sd.ModifiedDate,sd.CreatedDate)>=@FromDate AND COALESCE(sd.ModifiedDate,sd.CreatedDate)<DATEADD(day,1,@ToDate)
 AND (@TutorId IS NULL OR tt.Id=@TutorId) AND (@StudentId IS NULL OR s.StudentId=@StudentId) AND (@SubjectId IS NULL OR sd.SubjectId=@SubjectId)
 AND (@Search IS NULL OR su.FullName LIKE @SearchLike OR st.Code LIKE @SearchLike OR tu.FullName LIKE @SearchLike)",
            "ChangedOn", true, "SalesDetailsId", false,
            new[] { "ChangedOn", "StudentName", "CourseName", "CurrentTutor", "StatusName" }),

        // ── I. Class alerts & cancellations ──────────────────────────────────
        ["alerts/cancellations"] = new($@"
SELECT K.ScheduleDetailsId,K.ClassDate,K.StartTime,K.EndTime,K.ScheduleType,K.StudentId,K.StudentCode,K.StudentName,K.TutorId,K.TutorName,
 K.SubjectName,K.CancelledBy,K.TutorStatus,K.StudentStatus,K.OperationStatus,{ClassNoteColumn}
FROM K {LatestClassNote}
WHERE K.IsCancelled=1 AND (@Status IS NULL OR K.CancelledBy=@Status)",
            "ClassDate", true, "ScheduleDetailsId", true,
            new[] { "ClassDate", "StudentName", "TutorName", "SubjectName", "CancelledBy" }),

        // PDF: a student cancelling more than 2 classes triggers a reminder. Default counts student-attributed
        // cancellations; status 'any' counts every cancellation on the student's classes.
        ["alerts/frequent-students"] = new(@"
SELECT StudentId,StudentCode,StudentName,COUNT_BIG(*) Classes,SUM(StudentCancelFlag) StudentCancellations,SUM(IsCancelled) AllCancellations,
 MAX(CASE WHEN IsCancelled=1 THEN ClassDate END) LastCancellation
FROM K GROUP BY StudentId,StudentCode,StudentName
HAVING (ISNULL(@Status,N'')<>N'any' AND SUM(StudentCancelFlag)>2) OR (@Status=N'any' AND SUM(IsCancelled)>2)",
            "AllCancellations", true, "StudentId", true,
            new[] { "StudentName", "Classes", "StudentCancellations", "AllCancellations", "LastCancellation" }),

        ["alerts/tutor-patterns"] = new(@"
SELECT * FROM (
 SELECT TutorId,TutorCode,TutorName,COUNT_BIG(*) Classes,SUM(TutorCancelFlag) TutorCancellations,SUM(IsCancelled) AllCancellations,
  CAST(100.0*SUM(IsCancelled)/NULLIF(COUNT_BIG(*),0) AS decimal(5,2)) CancellationPct,
  MAX(MaxCancellations) CancellationLimit,MAX(CancelRatio) CancelRatioLimit,
  CASE WHEN SUM(TutorCancelFlag)>MAX(MaxCancellations) THEN 1 ELSE 0 END OverCancellationLimit,
  CASE WHEN 100.0*SUM(IsCancelled)/NULLIF(COUNT_BIG(*),0)>=MAX(CancelRatio) THEN 1 ELSE 0 END OverCancelRatio
 FROM K GROUP BY TutorId,TutorCode,TutorName HAVING SUM(IsCancelled)>0
) p
WHERE @Status IS NULL OR (@Status=N'flagged' AND (OverCancellationLimit=1 OR OverCancelRatio=1))",
            "AllCancellations", true, "TutorId", true,
            new[] { "TutorName", "Classes", "TutorCancellations", "AllCancellations", "CancellationPct" }),

        ["alerts/missed"] = new(@"
SELECT ScheduleDetailsId,ClassDate,StartTime,EndTime,StudentId,StudentCode,StudentName,TutorId,TutorName,SubjectName,
 StudentStatus,TutorStatus,TutorLateMinutes,StudentLateMinutes,
 CONCAT_WS(N', ',CASE WHEN TutorMissing=1 THEN N'Tutor attendance missing' END,CASE WHEN StudentMissing=1 THEN N'Student attendance missing' END,
  CASE WHEN TutorLate=1 THEN N'Tutor late' END,CASE WHEN StudentLate=1 THEN N'Student late' END) AlertType
FROM K
WHERE (StudentMissing=1 OR TutorMissing=1 OR TutorLate=1 OR StudentLate=1)
 AND (@Status IS NULL OR (@Status=N'missing' AND (StudentMissing=1 OR TutorMissing=1)) OR (@Status=N'late' AND (TutorLate=1 OR StudentLate=1)))",
            "ClassDate", true, "ScheduleDetailsId", true,
            new[] { "ClassDate", "StartTime", "StudentName", "TutorName", "SubjectName", "AlertType" }),

        // Absences + student-attributed cancellations as a share of the student's classes, flagged at the
        // configured CancelClassRatio threshold (no separate attendance-rate threshold exists).
        ["alerts/low-attendance"] = new(@"
SELECT * FROM (
 SELECT StudentId,StudentCode,StudentName,COUNT_BIG(*) Classes,SUM(Due) ClassesDue,SUM(StudentAttended) ClassesAttended,
  SUM(StudentAbsent) Absent,SUM(StudentCancelFlag) StudentCancellations,
  CAST(100.0*(SUM(StudentAbsent)+SUM(StudentCancelFlag))/NULLIF(SUM(Due)+SUM(StudentCancelFlag),0) AS decimal(5,2)) MissedPct,
  MAX(CancelRatio) ThresholdPct
 FROM K GROUP BY StudentId,StudentCode,StudentName
) p
WHERE MissedPct>=ThresholdPct",
            "MissedPct", true, "StudentId", true,
            new[] { "StudentName", "Classes", "ClassesDue", "ClassesAttended", "Absent", "StudentCancellations", "MissedPct" }),
    };

    private const string RatingsBody = @"
SELECT r.Id RatingId,r.RatedAt,t.Id TutorId,COALESCE(tu.FullName,CONCAT(tu.FirstName,N' ',tu.LastName)) TutorName,
 ISNULL(role.RoleName,N'Not recorded') RaterRole,r.Rating,r.Topic,r.Feedback
FROM dbo.UserClassRating r JOIN dbo.[User] tu ON tu.Id=r.RatedUserId LEFT JOIN dbo.Tutor t ON t.UserId=tu.Id
OUTER APPLY (SELECT TOP 1 ro.RoleName FROM dbo.UserRole ur JOIN dbo.Roles ro ON ro.Id=ur.RoleId WHERE ur.UserId=r.RaterId) role
WHERE r.RatedAt>=@FromDate AND r.RatedAt<DATEADD(day,1,@ToDate) AND (@TutorId IS NULL OR t.Id=@TutorId)
 AND (@Search IS NULL OR tu.FullName LIKE @SearchLike OR r.Feedback LIKE @SearchLike OR r.Topic LIKE @SearchLike)
 AND (@Status IS NULL OR (@Status=N'low' AND r.Rating<=2) OR (@Status=N'high' AND r.Rating>=4))";

    // One row of headline numbers per report, computed from the same CTEs as its views.
    private static readonly Dictionary<string, (string Sql, bool ClassSearch)> Summaries = new(StringComparer.OrdinalIgnoreCase)
    {
        ["attendance"] = (@"
SELECT COUNT_BIG(*) Classes,ISNULL(SUM(Due),0) ClassesDue,ISNULL(SUM(StudentSubmitted),0) StudentSubmitted,ISNULL(SUM(TutorSubmitted),0) TutorSubmitted,
 ISNULL(SUM(StudentMissing),0) StudentMissing,ISNULL(SUM(TutorMissing),0) TutorMissing,ISNULL(SUM(StudentAbsent),0) StudentAbsent,
 ISNULL(SUM(TutorAbsent),0) TutorAbsent,ISNULL(SUM(CASE WHEN TutorLate=1 OR StudentLate=1 THEN 1 ELSE 0 END),0) LateClasses,
 CAST(100.0*SUM(StudentAttended)/NULLIF(SUM(Due),0) AS decimal(5,2)) StudentAttendancePct,
 CAST(100.0*SUM(TutorSubmitted)/NULLIF(SUM(Due),0) AS decimal(5,2)) TutorCompliancePct,
 (SELECT LateMinutes FROM Th) LateThresholdMinutes,
 ISNULL(SUM(CASE WHEN TutorStartTime IS NOT NULL OR StudentStartTime IS NOT NULL THEN 1 ELSE 0 END),0) ClassesWithLoginTimes
FROM K", true),

        ["completion"] = (@"
SELECT COUNT_BIG(*) Scheduled,ISNULL(SUM(CASE WHEN Outcome=N'Completed' THEN 1 ELSE 0 END),0) Completed,ISNULL(SUM(IsCancelled),0) Cancelled,
 ISNULL(SUM(CASE WHEN Outcome=N'Rescheduled' THEN 1 ELSE 0 END),0) Rescheduled,
 ISNULL(SUM(CASE WHEN Outcome=N'Reschedule requested' THEN 1 ELSE 0 END),0) RescheduleRequested,
 ISNULL(SUM(CASE WHEN Outcome=N'Not updated' THEN 1 ELSE 0 END),0) NotUpdated,
 ISNULL(SUM(CASE WHEN Outcome=N'Upcoming' THEN 1 ELSE 0 END),0) Upcoming,
 CAST(100.0*SUM(CASE WHEN Outcome=N'Completed' THEN 1 ELSE 0 END)/NULLIF(COUNT_BIG(*),0) AS decimal(5,2)) CompletionPct,
 CAST(100.0*SUM(IsCancelled)/NULLIF(COUNT_BIG(*),0) AS decimal(5,2)) CancellationPct
FROM K", true),

        ["tutors"] = (@"
SELECT
 (SELECT COUNT_BIG(*) FROM dbo.Tutor t JOIN dbo.[User] u ON u.Id=t.UserId WHERE t.IsActive=1 AND ISNULL(u.IsActive,0)=1
   AND (@TutorId IS NULL OR t.Id=@TutorId)) ActiveTutors,
 (SELECT CAST(AVG(CONVERT(decimal(10,2),r.Rating)) AS decimal(5,2)) FROM dbo.UserClassRating r LEFT JOIN dbo.Tutor t ON t.UserId=r.RatedUserId
   WHERE r.RatedAt>=@FromDate AND r.RatedAt<DATEADD(day,1,@ToDate) AND (@TutorId IS NULL OR t.Id=@TutorId)) AverageRating,
 (SELECT COUNT_BIG(*) FROM dbo.UserClassRating r LEFT JOIN dbo.Tutor t ON t.UserId=r.RatedUserId
   WHERE r.RatedAt>=@FromDate AND r.RatedAt<DATEADD(day,1,@ToDate) AND (@TutorId IS NULL OR t.Id=@TutorId)) Ratings,
 (SELECT COUNT_BIG(*) FROM (SELECT t.Id FROM dbo.Tutor t JOIN dbo.[User] u ON u.Id=t.UserId
   LEFT JOIN dbo.TutorStudentAllocations a ON a.TutorId=t.Id AND ISNULL(a.IsActive,0)=1 AND a.CreatedDate>=u.JoiningDate AND a.CreatedDate<DATEADD(month,3,u.JoiningDate)
   WHERE t.IsActive=1 AND ISNULL(u.IsActive,0)=1 AND u.JoiningDate IS NOT NULL AND (@TutorId IS NULL OR t.Id=@TutorId)
   GROUP BY t.Id HAVING COUNT(DISTINCT a.StudentId)<=5) low) LowEngagementTutors,
 (SELECT ISNULL(SUM(TutorCancelFlag),0) FROM K) TutorCancellations,
 (SELECT COUNT_BIG(*) FROM dbo.SalesDetails sd JOIN dbo.Type_Code dc ON dc.Id=sd.Status LEFT JOIN dbo.Tutor t ON t.UserId=sd.TutorId
   WHERE sd.IsActive=1 AND dc.TypeCodeValue IN (20005,20026,20031,20032) AND (@TutorId IS NULL OR t.Id=@TutorId)) Dropouts", false),

        ["enrollment"] = (@"
SELECT
 (SELECT COUNT_BIG(*) FROM dbo.Student st JOIN dbo.[User] u ON u.Id=st.UserId WHERE st.IsActive=1 AND ISNULL(u.IsActive,0)=1) ActiveStudents,
 COUNT_BIG(*) Enrollments,COUNT(DISTINCT StudentId) EnrolledStudents,COUNT(DISTINCT SubjectId) Courses,
 ISNULL(SUM(CASE WHEN Category=N'Active' THEN 1 ELSE 0 END),0) ActiveEnrollments,
 ISNULL(SUM(CASE WHEN Category=N'Holding' THEN 1 ELSE 0 END),0) Holding,
 ISNULL(SUM(CASE WHEN Category=N'Dropped' THEN 1 ELSE 0 END),0) Dropped,
 ISNULL(SUM(CASE WHEN Category=N'Demo / pipeline' THEN 1 ELSE 0 END),0) Pipeline
FROM E", true),

        ["assessments"] = (@"
SELECT COUNT_BIG(*) Tests,ISNULL(SUM(CASE WHEN AnswerSheetSubmissionId IS NOT NULL THEN 1 ELSE 0 END),0) Submitted,
 ISNULL(SUM(CASE WHEN EvaluationStatus=N'Evaluated' THEN 1 ELSE 0 END),0) Evaluated,
 ISNULL(SUM(CASE WHEN AnswerSheetSubmissionId IS NOT NULL AND ISNULL(EvaluationStatus,N'')<>N'Evaluated' THEN 1 ELSE 0 END),0) PendingEvaluation,
 CAST(AVG(ScorePct) AS decimal(6,2)) AvgScorePct,
 ISNULL(SUM(CASE WHEN ScorePct<th.LowScore THEN 1 ELSE 0 END),0) NeedAttentionTests,
 (SELECT LowScore FROM Th) LowScoreThresholdPct
FROM TT CROSS JOIN Th th", true),

        ["progress"] = (@"
SELECT
 (SELECT COUNT_BIG(*) FROM dbo.Student st JOIN dbo.[User] u ON u.Id=st.UserId WHERE st.IsActive=1 AND ISNULL(u.IsActive,0)=1) ActiveStudents,
 (SELECT COUNT(DISTINCT StudentId) FROM K) StudentsWithClasses,
 (SELECT CAST(100.0*SUM(StudentAttended)/NULLIF(SUM(Due),0) AS decimal(5,2)) FROM K) AttendancePct,
 (SELECT COUNT_BIG(*) FROM dbo.SalesDetails sd JOIN dbo.Type_Code tc ON tc.Id=sd.Status WHERE sd.IsActive=1 AND tc.TypeCodeValue IN (20039,20040)) OnHold,
 (SELECT COUNT_BIG(*) FROM dbo.SalesDetails sd JOIN dbo.Type_Code tc ON tc.Id=sd.Status WHERE sd.IsActive=1 AND tc.TypeCodeValue IN (20005,20031,20032)) Dropped,
 (SELECT COUNT_BIG(*) FROM dbo.SalesDetails sd JOIN dbo.Type_Code tc ON tc.Id=sd.Status WHERE sd.IsActive=1 AND tc.TypeCodeValue=20026) TutorChanged", false),

        ["feedback"] = (@"
SELECT
 (SELECT COUNT_BIG(*) FROM dbo.UserClassRating r WHERE r.RatedAt>=@FromDate AND r.RatedAt<DATEADD(day,1,@ToDate)) Ratings,
 (SELECT CAST(AVG(CONVERT(decimal(10,2),r.Rating)) AS decimal(5,2)) FROM dbo.UserClassRating r WHERE r.RatedAt>=@FromDate AND r.RatedAt<DATEADD(day,1,@ToDate)) AverageRating,
 (SELECT COUNT_BIG(*) FROM dbo.TctLearningExperienceFeedback f WHERE f.CreatedOnUtc>=@FromDate AND f.CreatedOnUtc<DATEADD(day,1,@ToDate)) ExperienceFeedback,
 (SELECT COUNT_BIG(*) FROM dbo.TctLearningExperienceFeedback f WHERE f.CreatedOnUtc>=@FromDate AND f.CreatedOnUtc<DATEADD(day,1,@ToDate) AND f.IsFlaggedForReview=1) FlaggedForReview,
 (SELECT COUNT_BIG(*) FROM dbo.TctLearningExperienceFeedback f WHERE f.CreatedOnUtc>=@FromDate AND f.CreatedOnUtc<DATEADD(day,1,@ToDate)
   AND (f.IssueTeachingMethod=1 OR f.IssuePunctuality=1 OR f.IssueCommunication=1 OR f.IssueTechnicalIssues=1 OR f.IssueOther=1)) WithIssues", false),

        ["ptm"] = (@"
SELECT CAST(NULL AS bigint) PtmRecords,
 (SELECT COUNT_BIG(*) FROM dbo.SalesDetails sd JOIN dbo.Type_Code tc ON tc.Id=sd.Status WHERE sd.IsActive=1 AND tc.TypeCodeValue=20026
   AND COALESCE(sd.ModifiedDate,sd.CreatedDate)>=@FromDate AND COALESCE(sd.ModifiedDate,sd.CreatedDate)<DATEADD(day,1,@ToDate)) TutorChanges", false),

        ["alerts"] = (@"
SELECT ISNULL(SUM(IsCancelled),0) Cancellations,ISNULL(SUM(TutorCancelFlag),0) TutorCancellations,ISNULL(SUM(StudentCancelFlag),0) StudentCancellations,
 ISNULL(SUM(CASE WHEN CancelledBy=N'Not specified' THEN 1 ELSE 0 END),0) CancellationsNotAttributed,
 (SELECT COUNT_BIG(*) FROM (SELECT StudentId FROM K GROUP BY StudentId HAVING SUM(StudentCancelFlag)>2) x) StudentsOverTwoCancellations,
 (SELECT COUNT_BIG(*) FROM (SELECT StudentId FROM K GROUP BY StudentId HAVING SUM(IsCancelled)>2) x) StudentsOverTwoAnyCancellations,
 ISNULL(SUM(CASE WHEN StudentMissing=1 OR TutorMissing=1 THEN 1 ELSE 0 END),0) MissedSubmissions,
 ISNULL(SUM(CASE WHEN TutorLate=1 OR StudentLate=1 THEN 1 ELSE 0 END),0) LateClasses
FROM K", true),
    };

    private readonly ApplicationDbContext _dbContext;

    public OperationsReportsRepository(ApplicationDbContext dbContext) => _dbContext = dbContext;

    public bool IsKnownView(string report, string view) => Views.ContainsKey($"{report}/{view}");

    public bool IsKnownReport(string report) => Summaries.ContainsKey(report);

    // Same visibility rule as the sidebar menu (MenuService): any of View/Add/Edit/Delete on an active menu row.
    private const string ReportMenuLinkPrefix = "/lms/operation/reports/";

    public async Task<bool> HasReportPermissionAsync(string roleName, string? report, CancellationToken token)
    {
        if (string.IsNullOrWhiteSpace(roleName)) return false;
        if (report != null && !Summaries.ContainsKey(report)) return false;

        DbConnection connection = _dbContext.Database.GetDbConnection();
        var openedHere = connection.State != ConnectionState.Open;
        if (openedHere) await connection.OpenAsync(token);
        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = @"
SELECT CASE WHEN EXISTS (
 SELECT 1 FROM dbo.RoleMenuPermission p JOIN dbo.Roles r ON r.Id=p.RoleId JOIN dbo.Menu m ON m.Id=p.MenuId
 WHERE r.RoleName=@RoleName AND m.IsActive=1 AND (p.[View]=1 OR p.[Add]=1 OR p.[Edit]=1 OR p.[Delete]=1)
  AND ((@Link IS NULL AND LEFT(m.Link,LEN(@Prefix))=@Prefix) OR m.Link=@Link)
) THEN 1 ELSE 0 END;";
            command.CommandTimeout = 30;
            Add(command, "@RoleName", DbType.String, roleName);
            Add(command, "@Link", DbType.String, report == null ? null : ReportMenuLinkPrefix + report);
            Add(command, "@Prefix", DbType.String, ReportMenuLinkPrefix);
            var result = await command.ExecuteScalarAsync(token);
            return Convert.ToInt32(result) == 1;
        }
        finally
        {
            if (openedHere) await connection.CloseAsync();
        }
    }

    public async Task<OperationsReportPage> GetPageAsync(OperationsReportRequest request, CancellationToken token)
    {
        var def = Views[$"{request.Report}/{request.View}"];
        var sort = request.SortBy != null && Array.Exists(def.SortColumns, c => c.Equals(request.SortBy, StringComparison.OrdinalIgnoreCase))
            ? Array.Find(def.SortColumns, c => c.Equals(request.SortBy, StringComparison.OrdinalIgnoreCase))!
            : def.DefaultSort;
        var descending = request.SortBy != null && sort.Equals(request.SortBy, StringComparison.OrdinalIgnoreCase)
            ? request.SortDescending
            : def.DefaultDesc;

        // Sort column comes from the view's allow-list above, never from raw input.
        var sql = $@"{Ctes},
Q AS ({def.Body})
SELECT Q.*,COUNT_BIG(*) OVER () TotalRows FROM Q
ORDER BY [{sort}] {(descending ? "DESC" : "ASC")}{(sort.Equals(def.TieBreak, StringComparison.OrdinalIgnoreCase) ? "" : $",[{def.TieBreak}]")}
OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;";

        var rows = await ExecuteAsync(sql, request, def.ClassSearch, token);
        long total = 0;
        foreach (var row in rows)
        {
            if (row is Dictionary<string, object?> editable && editable.Remove("TotalRows", out var value) && value != null)
                total = Convert.ToInt64(value);
        }
        if (rows.Count == 0 && request.Page > 1)
        {
            // Page past the end (e.g. after a filter change): report the total so the client can step back.
            var countSql = $"{Ctes},\nQ AS ({def.Body})\nSELECT COUNT_BIG(*) TotalRows FROM Q;";
            var count = await ExecuteAsync(countSql, request with { Page = 1 }, def.ClassSearch, token);
            total = count.Count > 0 && count[0]["TotalRows"] != null ? Convert.ToInt64(count[0]["TotalRows"]) : 0;
        }

        return new OperationsReportPage(rows, total, request.Page, request.PageSize);
    }

    public async Task<IReadOnlyDictionary<string, object?>?> GetSummaryAsync(OperationsReportRequest request, CancellationToken token)
    {
        var (summarySql, classSearch) = Summaries[request.Report];
        var rows = await ExecuteAsync($"{Ctes}\n{summarySql};", request, classSearch, token);
        return rows.FirstOrDefault();
    }

    public async Task<IReadOnlyDictionary<string, IReadOnlyList<IReadOnlyDictionary<string, object?>>>> GetFilterOptionsAsync(
        CancellationToken token)
    {
        var empty = new OperationsReportRequest("", "", DateTime.Today, DateTime.Today, null, null, null, null, null, "day", null, false, 1, 1);
        return new Dictionary<string, IReadOnlyList<IReadOnlyDictionary<string, object?>>>
        {
            ["tutors"] = await ExecuteAsync($@"
SELECT t.Id Value,{TutorName} Label FROM dbo.Tutor t JOIN dbo.[User] u ON u.Id=t.UserId
WHERE t.IsActive=1 AND ISNULL(u.IsActive,0)=1 ORDER BY Label;", empty, false, token),
            ["students"] = await ExecuteAsync(@"
SELECT st.Id Value,CONCAT(COALESCE(u.FullName,CONCAT(u.FirstName,N' ',u.LastName)),CASE WHEN st.Code IS NOT NULL THEN CONCAT(N' (',st.Code,N')') END) Label
FROM dbo.Student st JOIN dbo.[User] u ON u.Id=st.UserId WHERE st.IsActive=1 AND ISNULL(u.IsActive,0)=1 ORDER BY Label;", empty, false, token),
            ["subjects"] = await ExecuteAsync(@"
SELECT tc.Id Value,tc.TypeCodeName Label FROM dbo.Type_Code tc JOIN dbo.TypeGroup g ON g.Id=tc.TypeGroupId
WHERE g.TypeGroupCode=500 AND tc.IsActive=1 ORDER BY Label;", empty, false, token),
        };
    }

    private async Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> ExecuteAsync(
        string sql, OperationsReportRequest request, bool classSearch, CancellationToken token)
    {
        DbConnection connection = _dbContext.Database.GetDbConnection();
        var openedHere = connection.State != ConnectionState.Open;
        if (openedHere) await connection.OpenAsync(token);

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = sql;
            command.CommandTimeout = 60;

            var like = request.Search == null ? null : $"%{EscapeLike(request.Search)}%";
            Add(command, "@FromDate", DbType.Date, request.FromDate.Date);
            Add(command, "@ToDate", DbType.Date, request.ToDate.Date);
            Add(command, "@Search", DbType.String, request.Search);
            Add(command, "@SearchLike", DbType.String, like);
            Add(command, "@ClassSearch", DbType.String, classSearch ? request.Search : null);
            Add(command, "@ClassSearchLike", DbType.String, classSearch ? like : null);
            Add(command, "@TutorId", DbType.Guid, request.TutorId);
            Add(command, "@StudentId", DbType.Guid, request.StudentId);
            Add(command, "@SubjectId", DbType.Guid, request.SubjectId);
            Add(command, "@Status", DbType.String, request.Status);
            Add(command, "@GroupBy", DbType.String, request.GroupBy);
            Add(command, "@Offset", DbType.Int32, (request.Page - 1) * request.PageSize);
            Add(command, "@PageSize", DbType.Int32, request.PageSize);

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

    // Search text is matched literally: LIKE wildcards typed by the user are escaped.
    private static string EscapeLike(string value)
        => value.Replace("[", "[[]").Replace("%", "[%]").Replace("_", "[_]");

    private static void Add(DbCommand command, string name, DbType type, object? value)
    {
        var parameter = command.CreateParameter();
        parameter.ParameterName = name;
        parameter.DbType = type;
        parameter.Value = value ?? DBNull.Value;
        if (type == DbType.String) parameter.Size = 4000;
        command.Parameters.Add(parameter);
    }
}
