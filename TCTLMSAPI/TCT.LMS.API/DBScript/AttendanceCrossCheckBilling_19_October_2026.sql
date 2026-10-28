/*
    Attendance cross-check billing (19-Oct-2026)

    Parent invoice and tutor pay now follow the Operations cross-check on the Class Attendance page:
      1013001 Ops Approved                   parent: Operations' attendance (tutor's if Operations recorded none)
                                             tutor:  tutor's attendance
      1013002 Go with tutors attendance      parent and tutor: tutor's attendance
      1013003 Go with operation attendance   parent and tutor: Operations' attendance
    Example: tutor marked 10 classes completed, Operations 12, cross-check "Ops Approved"
             -> parent billed 12, tutor paid 10.

    This script:
      1. creates dbo.vw_ClassAttendanceBilling (one row per class: is it billable / payable / awaiting cross-check);
         the same rule is in TCT.LMS.Application/Services/AttendanceBillingRule.cs - keep the two in step;
      2. renames lookup 1013003 to "Go with operation attendance(Ops Approved)" (it was a copy of 1013002's name);
      3. updates usp_GenerateTutorInvoice to pay IsTutorPayable classes
         (same as TCTDatabase/DDL/usp_GenerateTutorInvoice_HoursBased.sql).
    Safe to re-run. Does not change issued invoices.
*/
SET NOCOUNT ON;
GO

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

UPDATE dbo.Type_Code
SET TypeCodeName = 'Go with operation attendance(Ops Approved)',
    TypeCodeDescription = 'Go with operation attendance(Ops Approved)'
WHERE TypeCodeValue = 1013003
  AND TypeCodeName LIKE 'Go with tutors attendance%';
GO

/*
    usp_GenerateTutorInvoice — switch tutor pay from per-class flat to per-HOUR.

    Change
    ------
    Old: TotalPayment = SUM(SalesDetails.TutorPayment) over each 'Class Completed' row,
         i.e. TutorPayment treated as a flat amount per class.
    New: each completed class is paid rounded_hours × TutorPayment, where rounded_hours
         rounds the class duration UP to the next 15 minutes (>1:00->1:15, >1:15->1:30, ...),
         the same rule the student invoice uses. TutorPayment is now a PER-HOUR rate,
         symmetric with SalesDetails.ParentPayment on the student side.

    Effect on existing data
    -----------------------
    For a standard 1-hour class, rounded_hours = 1, so pay is unchanged. Classes that run
    longer now pay proportionally more. If your stored TutorPayment values were per-class
    amounts for 1-hour classes, no back-fill is needed. If any class is routinely longer
    than an hour, confirm the TutorPayment values are intended as hourly before running.

    Only the two payment calculations changed; all other logic (validation, invoice number,
    class counts, detail rows) is identical to the original.

    19-Oct-2026: classes paid = dbo.vw_ClassAttendanceBilling.IsTutorPayable (the Operations
    cross-check decides between the tutor's and Operations' attendance) instead of
    Status = 'Class Completed' (Operations' record) + Ops-approved. Requires the view from
    TCT.LMS.API/DBScript/AttendanceCrossCheckBilling_19_October_2026.sql.

    Idempotent via CREATE OR ALTER — safe to re-run.
*/
CREATE OR ALTER PROCEDURE [dbo].[usp_GenerateTutorInvoice]
    @InputYear INT,
    @InputMonth INT,
    @TutorId UNIQUEIDENTIFIER,
    @CreatedBy UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @MonthStartDate DATE = DATEFROMPARTS(@InputYear, @InputMonth, 1);
    DECLARE @MonthEndDate DATE = DATEADD(MONTH, 1, @MonthStartDate);
    DECLARE @InvoiceId BIGINT;
    DECLARE @Now DATETIME = GETDATE();

    DECLARE @CancelledStatusId UNIQUEIDENTIFIER;

    -- Get TypeCode Id for Cancelled (20021) only - used for cancelled count
    SELECT @CancelledStatusId = TC.Id
    FROM Type_Code TC
    WHERE TC.TypeCodeValue = 20021 AND TC.IsActive = 1;

    -- Pay only classes the Operations cross-check makes payable to the tutor
    -- (dbo.vw_ClassAttendanceBilling.IsTutorPayable): the tutor's own attendance record, or
    -- Operations' record when Operations chose "Go with operation attendance".

    -- Check if payable classes exist
    IF NOT EXISTS (
        SELECT 1
        FROM Schedule SCH
        INNER JOIN ScheduleDetails SCD ON SCH.ScheduleId = SCD.ScheduleId
        WHERE SCH.TutorId = @TutorId
          AND SCD.Date >= @MonthStartDate
          AND SCD.Date < @MonthEndDate
          AND EXISTS (SELECT 1 FROM dbo.vw_ClassAttendanceBilling B WHERE B.ScheduleDetailsId = SCD.ScheduleDetailsId AND B.IsTutorPayable = 1)
    )
    BEGIN
        RAISERROR('No Operations-approved completed classes found for the specified tutor and month.', 16, 1);
        RETURN;
    END;

    -- First ScheduleId and Total Payment (rounded hours x per-hour TutorPayment)
    DECLARE @FirstScheduleId UNIQUEIDENTIFIER;
    DECLARE @TotalPayment DECIMAL(18, 2);

    SELECT TOP 1
        @FirstScheduleId = SCH.ScheduleId,
        @TotalPayment = (
            SELECT SUM(
                        (CEILING(DATEDIFF(MINUTE, SCD2.StartTime, SCD2.EndTime) / 15.0) * 15 / 60.0)
                        * SAD.TutorPayment
                   )
            FROM Schedule SCH2
            INNER JOIN ScheduleDetails SCD2 ON SCH2.ScheduleId = SCD2.ScheduleId
            INNER JOIN SalesDetails SAD ON SAD.Id = SCH2.SalesDetailsId
            WHERE SCH2.TutorId = @TutorId
              AND SCD2.Date >= @MonthStartDate
              AND SCD2.Date < @MonthEndDate
              AND EXISTS (SELECT 1 FROM dbo.vw_ClassAttendanceBilling B WHERE B.ScheduleDetailsId = SCD2.ScheduleDetailsId AND B.IsTutorPayable = 1)
        )
    FROM Schedule SCH
    INNER JOIN ScheduleDetails SCD ON SCH.ScheduleId = SCD.ScheduleId
    WHERE SCH.TutorId = @TutorId
      AND SCD.Date >= @MonthStartDate
      AND SCD.Date < @MonthEndDate
      AND EXISTS (SELECT 1 FROM dbo.vw_ClassAttendanceBilling B WHERE B.ScheduleDetailsId = SCD.ScheduleDetailsId AND B.IsTutorPayable = 1);

    -- Generate InvoiceNumber
    DECLARE @InvoiceNumber VARCHAR(50);
    SET @InvoiceNumber = 'INV-' +
                         CONVERT(VARCHAR(8), @Now, 112) + '-' +
                         REPLACE(CONVERT(VARCHAR(8), @Now, 108), ':', '') + '-' +
                         CONVERT(VARCHAR(10), ABS(CHECKSUM(NEWID())));

    BEGIN TRANSACTION;
    BEGIN TRY
    -- Insert into TutorInvoice
    INSERT INTO TutorInvoice (
        InvoiceNumber, TutorId, ScheduleId, TutorTotalPayment,
        Month, Year, EmailSentDate, IsActive, CreatedBy, CreatedDate
    )
    VALUES (
        @InvoiceNumber, @TutorId, @FirstScheduleId, @TotalPayment,
        @InputMonth, @InputYear, NULL, 1, @CreatedBy, @Now
    );

    SET @InvoiceId = SCOPE_IDENTITY();

    -- Insert into TutorInvoiceDetails.
    -- SubjectPayment now holds this class's pay = rounded hours x per-hour TutorPayment,
    -- so the detail rows sum to TutorTotalPayment above.
    INSERT INTO TutorInvoiceDetails (
        TutorInvoiceId, ScheduleDetailsId, StudentId, StudentName,
        ScheduleDate, SubjectPayment, NoOfScheduledClasses,
        NoOfClassesCompleted, NoOfClassesCancelled, IsActive, CreatedBy, CreatedDate
    )
    SELECT
        @InvoiceId,
        SCD.ScheduleDetailsId,
        SAS.StudentId,
        USR.FullName,
        SCD.Date,
        (CEILING(DATEDIFF(MINUTE, SCD.StartTime, SCD.EndTime) / 15.0) * 15 / 60.0) * SAD.TutorPayment,
        (
            SELECT COUNT(*)
            FROM ScheduleDetails SCD2
            WHERE SCD2.ScheduleId = SCH.ScheduleId
              AND SCD2.Date >= @MonthStartDate AND SCD2.Date < @MonthEndDate
        ),
        (
            SELECT COUNT(*)
            FROM ScheduleDetails SCD2
            WHERE SCD2.ScheduleId = SCH.ScheduleId
              AND SCD2.Date >= @MonthStartDate AND SCD2.Date < @MonthEndDate
              AND EXISTS (SELECT 1 FROM dbo.vw_ClassAttendanceBilling B WHERE B.ScheduleDetailsId = SCD2.ScheduleDetailsId AND B.IsTutorPayable = 1)
        ),
        (
            SELECT COUNT(*)
            FROM ScheduleDetails SCD2
            WHERE SCD2.ScheduleId = SCH.ScheduleId
              AND SCD2.Date >= @MonthStartDate AND SCD2.Date < @MonthEndDate
              AND (
                    SCD2.TutorScheduleStatus = @CancelledStatusId OR
                    SCD2.StudentScheduleStatus = @CancelledStatusId
                  )
        ),
        1, @CreatedBy, @Now
    FROM Schedule SCH
    INNER JOIN ScheduleDetails SCD ON SCH.ScheduleId = SCD.ScheduleId
    INNER JOIN SalesDetails SAD ON SAD.Id = SCH.SalesDetailsId
    INNER JOIN Sales SAS ON SAS.Id = SAD.SalesId
    INNER JOIN Student STD ON STD.Id = SAS.StudentId
    INNER JOIN [User] USR ON USR.Id = STD.UserId
    WHERE SCH.TutorId = @TutorId
      AND SCD.Date >= @MonthStartDate
      AND SCD.Date < @MonthEndDate
      AND EXISTS (SELECT 1 FROM dbo.vw_ClassAttendanceBilling B WHERE B.ScheduleDetailsId = SCD.ScheduleDetailsId AND B.IsTutorPayable = 1);

    COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;

    -- Return
    SELECT @InvoiceId AS InvoiceId, @TotalPayment AS TotalPayment, @InvoiceNumber AS InvoiceNumber;

END;

GO
