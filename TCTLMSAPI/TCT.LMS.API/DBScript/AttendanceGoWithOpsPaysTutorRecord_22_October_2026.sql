/*
    Attendance cross-check: "Go with operation attendance" (1013003) pays the tutor from the tutor's own record.
    Example: tutor recorded 10 classes, Operations 12, cross-checked as "Go with operation attendance":
      parent invoice = 12 (Operations' record), tutor payroll = 10 (tutor's record).

    After this script the tutor is paid from the tutor's own record for all three cross-check choices:
      1013001 Ops Approved                   parent: Operations' record (tutor's if Operations recorded none); tutor: tutor's record
      1013002 Go with tutors attendance      parent and tutor: tutor's record
      1013003 Go with operation attendance   parent: Operations' record; tutor: tutor's record

    Only IsTutorPayable changes. usp_GenerateTutorInvoice reads this view, so payslips generated after this run
    follow the new rule; payslips already generated keep their amounts.
    Must match AttendanceBillingRule.IsTutorPayable (TCT.LMS.Application/Services/AttendanceBillingRule.cs).
    Run after AttendanceCrossCheckBilling_19_October_2026.sql. View only, no data change. Safe to re-run.
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
    -- The tutor is paid from the tutor's own record, whichever cross-check choice was made.
    CASE WHEN f.CrossCheckCode IN (1013001, 1013002, 1013003) THEN f.TutorCompleted ELSE 0 END AS IsTutorPayable
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
