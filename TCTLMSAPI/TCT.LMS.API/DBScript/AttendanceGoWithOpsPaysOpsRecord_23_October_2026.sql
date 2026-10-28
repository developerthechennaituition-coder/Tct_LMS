/*
    Attendance cross-check: parent and tutor always use the same attendance record.
      1013001 Ops Approved                   (tutor and Operations agree)  parent: Operations' record (tutor's if none); tutor: tutor's record
      1013002 Go with tutors attendance      parent and tutor: tutor's record
      1013003 Go with operation attendance   parent and tutor: Operations' record
    Example: tutor recorded 10 classes, Operations 12.
      Go with operation attendance -> parent 12, tutor 12.   Go with tutors attendance -> parent 10, tutor 10.
    Equal case (tutor 10, Operations 10) with Ops Approved -> parent 10, tutor 10.

    Replaces AttendanceGoWithOpsPaysTutorRecord_22_October_2026.sql (which paid the tutor 10 for Go with operation
    attendance). Only IsTutorPayable for 1013003 changes. usp_GenerateTutorInvoice reads this view, so payslips
    generated after this run follow the new rule; payslips already generated keep their amounts.
    Must match AttendanceBillingRule.IsTutorPayable (TCT.LMS.Application/Services/AttendanceBillingRule.cs).
    View only, no data change. Safe to re-run.
*/
CREATE OR ALTER VIEW dbo.vw_ClassAttendanceBilling
AS
SELECT
    d.ScheduleDetailsId,
    d.ScheduleId,
    d.[Date],
    d.ScheduleType,
    f.TutorCompleted,
    f.OpsRecorded,
    f.OpsCompleted,
    f.CrossCheckCode,
    f.NotTakingPlace,
    CASE WHEN f.CrossCheckCode IS NULL AND f.NotTakingPlace = 0 THEN 1 ELSE 0 END AS IsAwaitingCrossCheck,
    CASE f.CrossCheckCode
        WHEN 1013002 THEN f.TutorCompleted
        WHEN 1013003 THEN f.OpsCompleted
        WHEN 1013001 THEN CASE WHEN f.OpsRecorded = 1 THEN f.OpsCompleted ELSE f.TutorCompleted END
        ELSE 0
    END AS IsParentBillable,
    -- Go with operation attendance pays the tutor from Operations' record; the other two from the tutor's.
    CASE f.CrossCheckCode
        WHEN 1013003 THEN f.OpsCompleted
        WHEN 1013001 THEN f.TutorCompleted
        WHEN 1013002 THEN f.TutorCompleted
        ELSE 0
    END AS IsTutorPayable
FROM dbo.ScheduleDetails d
LEFT JOIN dbo.Type_Code tutorStatus ON tutorStatus.Id = d.TutorScheduleStatus
LEFT JOIN dbo.Type_Code crossCheck ON crossCheck.Id = d.OperationScheduleStatus
CROSS APPLY (
    SELECT
        -- Tutor's attendance: a Class Completed status (any variant) from the tutor.
        CASE WHEN tutorStatus.TypeCodeValue IN (1009001, 1009008, 1009009, 1009010, 20020) THEN 1 ELSE 0 END AS TutorCompleted,
        -- Operations' attendance: ScheduleDetails.Status, written only when Operations save the class status.
        CASE WHEN NULLIF(LTRIM(RTRIM(d.[Status])), '') IS NOT NULL THEN 1 ELSE 0 END AS OpsRecorded,
        CASE WHEN LTRIM(d.[Status]) LIKE 'Class Completed%' THEN 1 ELSE 0 END AS OpsCompleted,
        CASE WHEN crossCheck.TypeCodeValue IN (1013001, 1013002, 1013003) THEN crossCheck.TypeCodeValue END AS CrossCheckCode,
        -- Cancelled / postponed / re-scheduled: decided by Operations' record when present, else the tutor's.
        CASE WHEN NULLIF(LTRIM(RTRIM(d.[Status])), '') IS NOT NULL
             THEN CASE WHEN EXISTS (SELECT 1 FROM dbo.Type_Code nt
                                    WHERE nt.TypeCodeValue IN (1009002, 1009003, 1009005, 1009006, 1009007, 20021)
                                      AND nt.TypeCodeName COLLATE DATABASE_DEFAULT = LTRIM(RTRIM(d.[Status])) COLLATE DATABASE_DEFAULT)
                       THEN 1 ELSE 0 END
             ELSE CASE WHEN tutorStatus.TypeCodeValue IN (1009002, 1009003, 1009005, 1009006, 1009007, 20021) THEN 1 ELSE 0 END
        END AS NotTakingPlace
) f;
GO
