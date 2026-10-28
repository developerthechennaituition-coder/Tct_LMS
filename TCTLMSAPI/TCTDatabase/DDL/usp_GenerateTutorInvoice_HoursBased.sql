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
    -- (dbo.vw_ClassAttendanceBilling.IsTutorPayable): Operations' record for "Go with operation attendance",
    -- otherwise the tutor's own record (since 23-Oct-2026, AttendanceGoWithOpsPaysOpsRecord_23_October_2026.sql).

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
                        * COALESCE(SCH2.TutorRate, SAD.TutorPayment)
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
        (CEILING(DATEDIFF(MINUTE, SCD.StartTime, SCD.EndTime) / 15.0) * 15 / 60.0) * COALESCE(SCH.TutorRate, SAD.TutorPayment),
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
