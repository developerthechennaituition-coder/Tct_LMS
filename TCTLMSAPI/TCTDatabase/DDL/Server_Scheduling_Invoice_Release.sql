/*
    Scheduling and invoice release schema, consolidated for SQL Server.

    BEFORE RUNNING:
      1. Back up the target database.
      2. Replace CHANGE_ME with the exact database name used by the server API's TCTDb connection.
      3. Execute this entire file once in SSMS/sqlcmd. It is safe to re-run.

    Adds missing columns/tables and backfills only missing academic closing dates.
    This script does not modify issued invoices, change fees, delete data, or
    reconcile the disputed October invoice.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @ExpectedDatabase sysname = N'CHANGE_ME';

IF @ExpectedDatabase = N'CHANGE_ME' OR DB_NAME() <> @ExpectedDatabase
    THROW 51000, 'Set @ExpectedDatabase to the server API database name before running this script.', 1;

DECLARE @RequiredTables TABLE (TableName sysname NOT NULL);
INSERT INTO @RequiredTables (TableName) VALUES
    (N'Schedule'), (N'ScheduleDetails'), (N'StudentRegistration'),
    (N'StudentInvoice'), (N'StudentInvoiceDetails'), (N'SalesDetails'),
    (N'TCTDetails'), (N'TCTBankDetails');

IF EXISTS (
    SELECT 1 FROM @RequiredTables
    WHERE OBJECT_ID(N'dbo.' + TableName, N'U') IS NULL
)
BEGIN
    SELECT DB_NAME() AS DatabaseName, TableName AS MissingTable
    FROM @RequiredTables
    WHERE OBJECT_ID(N'dbo.' + TableName, N'U') IS NULL;
    THROW 51001, 'A required base table is missing. No schema changes were made.', 1;
END;

BEGIN TRY
    BEGIN TRANSACTION;

    -- Class scheduling: academic window and fixed-count schedules.
    IF COL_LENGTH(N'dbo.Schedule', N'NoOfMonths') IS NULL
        EXEC(N'ALTER TABLE dbo.Schedule ADD NoOfMonths INT NULL;');
    IF COL_LENGTH(N'dbo.Schedule', N'ScheduleMode') IS NULL
        EXEC(N'ALTER TABLE dbo.Schedule ADD ScheduleMode NVARCHAR(20) NULL;');
    IF COL_LENGTH(N'dbo.Schedule', N'TotalClasses') IS NULL
        EXEC(N'ALTER TABLE dbo.Schedule ADD TotalClasses INT NULL;');
    IF COL_LENGTH(N'dbo.Schedule', N'ScheduleEndDate') IS NULL
        EXEC(N'ALTER TABLE dbo.Schedule ADD ScheduleEndDate DATETIME2 NULL;');

    IF NOT EXISTS (
        SELECT 1 FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID(N'dbo.Schedule')
          AND name = N'CK_Schedule_ScheduleMode'
    )
        EXEC(N'ALTER TABLE dbo.Schedule ADD CONSTRAINT CK_Schedule_ScheduleMode
            CHECK (ScheduleMode IS NULL OR ScheduleMode IN (''OneTime'', ''Weekly'', ''FixedCount'', ''Temporary''));');

    IF NOT EXISTS (
        SELECT 1 FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID(N'dbo.Schedule')
          AND name = N'CK_Schedule_TotalClasses_Positive'
    )
        EXEC(N'ALTER TABLE dbo.Schedule ADD CONSTRAINT CK_Schedule_TotalClasses_Positive
            CHECK (TotalClasses IS NULL OR TotalClasses > 0);');

    -- Only backfill known recurring terms. Academic closing is month-end.
    EXEC(N'UPDATE dbo.Schedule
          SET ScheduleEndDate = EOMONTH(DATEADD(MONTH, NoOfMonths, StartDate))
          WHERE ScheduleEndDate IS NULL
            AND NoOfMonths BETWEEN 1 AND 10
            AND ScheduleMode = ''Weekly'';');

    IF COL_LENGTH(N'dbo.ScheduleDetails', N'ClassReminderSentDate') IS NULL
        EXEC(N'ALTER TABLE dbo.ScheduleDetails ADD ClassReminderSentDate DATETIME2 NULL;');

    IF COL_LENGTH(N'dbo.StudentRegistration', N'AnnualExamMonth') IS NULL
        EXEC(N'ALTER TABLE dbo.StudentRegistration ADD AnnualExamMonth INT NULL;');

    -- Invoice creation and display.
    IF COL_LENGTH(N'dbo.StudentInvoice', N'InvoiceType') IS NULL
        EXEC(N'ALTER TABLE dbo.StudentInvoice ADD InvoiceType NVARCHAR(20) NULL;');
    IF COL_LENGTH(N'dbo.StudentInvoice', N'PaymentUrl') IS NULL
        EXEC(N'ALTER TABLE dbo.StudentInvoice ADD PaymentUrl NVARCHAR(MAX) NULL;');
    IF COL_LENGTH(N'dbo.StudentInvoiceDetails', N'SubjectAmount') IS NULL
        EXEC(N'ALTER TABLE dbo.StudentInvoiceDetails ADD SubjectAmount DECIMAL(18, 2) NULL;');
    IF COL_LENGTH(N'dbo.TCTDetails', N'HSNCode') IS NULL
        EXEC(N'ALTER TABLE dbo.TCTDetails ADD HSNCode NVARCHAR(MAX) NULL;');
    IF COL_LENGTH(N'dbo.TCTBankDetails', N'UpiID') IS NULL
        EXEC(N'ALTER TABLE dbo.TCTBankDetails ADD UpiID NVARCHAR(100) NULL;');
    IF COL_LENGTH(N'dbo.TCTBankDetails', N'SwiftCode') IS NULL
        EXEC(N'ALTER TABLE dbo.TCTBankDetails ADD SwiftCode NVARCHAR(100) NULL;');
    IF COL_LENGTH(N'dbo.TCTBankDetails', N'IBANNumber') IS NULL
        EXEC(N'ALTER TABLE dbo.TCTBankDetails ADD IBANNumber NVARCHAR(100) NULL;');

    -- Prepaid plans: the invoice view queries these even for a regular invoice.
    IF OBJECT_ID(N'dbo.StudentPaymentPlan', N'U') IS NULL
        EXEC(N'CREATE TABLE dbo.StudentPaymentPlan (
            Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_StudentPaymentPlan_Id DEFAULT NEWSEQUENTIALID(),
            SalesDetailsId UNIQUEIDENTIFIER NOT NULL,
            StudentId UNIQUEIDENTIFIER NOT NULL,
            PlanMonths INT NOT NULL,
            StartMonth INT NOT NULL,
            StartYear INT NOT NULL,
            TotalClasses INT NULL,
            TotalFee DECIMAL(18, 2) NOT NULL,
            InstallmentCount INT NOT NULL CONSTRAINT DF_StudentPaymentPlan_InstallmentCount DEFAULT 1,
            CreatedBy UNIQUEIDENTIFIER NOT NULL,
            CreatedDate DATETIME2 NOT NULL CONSTRAINT DF_StudentPaymentPlan_CreatedDate DEFAULT GETDATE(),
            ModifiedBy UNIQUEIDENTIFIER NULL,
            ModifiedDate DATETIME2 NULL,
            IsActive BIT NOT NULL CONSTRAINT DF_StudentPaymentPlan_IsActive DEFAULT 1,
            CONSTRAINT PK_StudentPaymentPlan PRIMARY KEY CLUSTERED (Id),
            CONSTRAINT FK_StudentPaymentPlan_SalesDetails
                FOREIGN KEY (SalesDetailsId) REFERENCES dbo.SalesDetails(Id)
        );');

    IF COL_LENGTH(N'dbo.StudentPaymentPlan', N'UpfrontInvoiceNumber') IS NULL
        EXEC(N'ALTER TABLE dbo.StudentPaymentPlan ADD UpfrontInvoiceNumber NVARCHAR(50) NULL;');
    IF COL_LENGTH(N'dbo.StudentPaymentPlan', N'IsBlocked') IS NULL
        EXEC(N'ALTER TABLE dbo.StudentPaymentPlan ADD IsBlocked BIT NOT NULL CONSTRAINT DF_StudentPaymentPlan_IsBlocked DEFAULT 0;');
    IF COL_LENGTH(N'dbo.StudentPaymentPlan', N'BlockedDate') IS NULL
        EXEC(N'ALTER TABLE dbo.StudentPaymentPlan ADD BlockedDate DATETIME2 NULL;');
    IF COL_LENGTH(N'dbo.StudentPaymentPlan', N'BalanceInvoiceNumber') IS NULL
        EXEC(N'ALTER TABLE dbo.StudentPaymentPlan ADD BalanceInvoiceNumber NVARCHAR(50) NULL;');

    IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE object_id = OBJECT_ID(N'dbo.StudentPaymentPlan')
          AND name = N'UX_StudentPaymentPlan_ActiveSalesDetails'
    )
        EXEC(N'CREATE UNIQUE INDEX UX_StudentPaymentPlan_ActiveSalesDetails
            ON dbo.StudentPaymentPlan(SalesDetailsId) WHERE IsActive = 1;');
    IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE object_id = OBJECT_ID(N'dbo.StudentPaymentPlan')
          AND name = N'IX_StudentPaymentPlan_Student'
    )
        EXEC(N'CREATE INDEX IX_StudentPaymentPlan_Student
            ON dbo.StudentPaymentPlan(StudentId) INCLUDE (IsActive);');

    IF OBJECT_ID(N'dbo.StudentPayment', N'U') IS NULL
        EXEC(N'CREATE TABLE dbo.StudentPayment (
            Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_StudentPayment_Id DEFAULT NEWSEQUENTIALID(),
            StudentPaymentPlanId UNIQUEIDENTIFIER NOT NULL,
            InstallmentNo INT NULL,
            Amount DECIMAL(18, 2) NOT NULL,
            PaidDate DATETIME2 NOT NULL,
            PaymentMode NVARCHAR(50) NULL,
            ReferenceNo NVARCHAR(100) NULL,
            Notes NVARCHAR(500) NULL,
            CreatedBy UNIQUEIDENTIFIER NOT NULL,
            CreatedDate DATETIME2 NOT NULL CONSTRAINT DF_StudentPayment_CreatedDate DEFAULT GETDATE(),
            ModifiedBy UNIQUEIDENTIFIER NULL,
            ModifiedDate DATETIME2 NULL,
            IsActive BIT NOT NULL CONSTRAINT DF_StudentPayment_IsActive DEFAULT 1,
            CONSTRAINT PK_StudentPayment PRIMARY KEY CLUSTERED (Id),
            CONSTRAINT FK_StudentPayment_Plan
                FOREIGN KEY (StudentPaymentPlanId) REFERENCES dbo.StudentPaymentPlan(Id)
        );');

    IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE object_id = OBJECT_ID(N'dbo.StudentPayment')
          AND name = N'IX_StudentPayment_Plan'
    )
        EXEC(N'CREATE INDEX IX_StudentPayment_Plan
            ON dbo.StudentPayment(StudentPaymentPlanId) INCLUDE (Amount, IsActive);');

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

SELECT DB_NAME() AS DatabaseName, N'Schema update completed' AS Result;
SELECT v.TableName, v.ColumnName,
       CASE WHEN COL_LENGTH(N'dbo.' + v.TableName, v.ColumnName) IS NULL
            THEN N'MISSING' ELSE N'OK' END AS Status
FROM (VALUES
    (N'Schedule', N'NoOfMonths'),
    (N'Schedule', N'ScheduleMode'),
    (N'Schedule', N'TotalClasses'),
    (N'Schedule', N'ScheduleEndDate'),
    (N'ScheduleDetails', N'ClassReminderSentDate'),
    (N'StudentRegistration', N'AnnualExamMonth'),
    (N'StudentInvoice', N'InvoiceType'),
    (N'StudentInvoice', N'PaymentUrl'),
    (N'StudentInvoiceDetails', N'SubjectAmount'),
    (N'TCTDetails', N'HSNCode'),
    (N'TCTBankDetails', N'UpiID'),
    (N'TCTBankDetails', N'SwiftCode'),
    (N'TCTBankDetails', N'IBANNumber'),
    (N'StudentPaymentPlan', N'UpfrontInvoiceNumber'),
    (N'StudentPaymentPlan', N'IsBlocked'),
    (N'StudentPaymentPlan', N'BlockedDate'),
    (N'StudentPaymentPlan', N'BalanceInvoiceNumber')
) AS v(TableName, ColumnName)
ORDER BY v.TableName, v.ColumnName;

GO

/*
    Tutor payslip generation.
    TutorPayment is an hourly rate. Each eligible class duration is rounded up
    to the next 15 minutes. Only completed classes with final Operations approval
    are payable. CREATE OR ALTER makes this section safe to redeploy.
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

    SELECT @CancelledStatusId = TC.Id
    FROM Type_Code TC
    WHERE TC.TypeCodeValue = 20021 AND TC.IsActive = 1;

    DECLARE @OpsApproved TABLE (Id UNIQUEIDENTIFIER PRIMARY KEY);
    INSERT INTO @OpsApproved (Id)
    SELECT TC.Id
    FROM Type_Code TC
    WHERE TC.IsActive = 1
      AND TC.TypeCodeValue IN (1013001, 1013002, 1013003);

    IF NOT EXISTS (
        SELECT 1
        FROM Schedule SCH
        INNER JOIN ScheduleDetails SCD ON SCH.ScheduleId = SCD.ScheduleId
        WHERE SCH.TutorId = @TutorId
          AND SCD.Date >= @MonthStartDate
          AND SCD.Date < @MonthEndDate
          AND SCD.Status = 'Class Completed'
          AND EXISTS (SELECT 1 FROM @OpsApproved OA WHERE OA.Id = SCD.OperationScheduleStatus)
    )
    BEGIN
        RAISERROR('No Operations-approved completed classes found for the specified tutor and month.', 16, 1);
        RETURN;
    END;

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
              AND SCD2.Status = 'Class Completed'
              AND EXISTS (SELECT 1 FROM @OpsApproved OA WHERE OA.Id = SCD2.OperationScheduleStatus)
        )
    FROM Schedule SCH
    INNER JOIN ScheduleDetails SCD ON SCH.ScheduleId = SCD.ScheduleId
    WHERE SCH.TutorId = @TutorId
      AND SCD.Date >= @MonthStartDate
      AND SCD.Date < @MonthEndDate
      AND SCD.Status = 'Class Completed'
      AND EXISTS (SELECT 1 FROM @OpsApproved OA WHERE OA.Id = SCD.OperationScheduleStatus);

    DECLARE @InvoiceNumber VARCHAR(50);
    SET @InvoiceNumber = 'INV-' +
                         CONVERT(VARCHAR(8), @Now, 112) + '-' +
                         REPLACE(CONVERT(VARCHAR(8), @Now, 108), ':', '') + '-' +
                         CONVERT(VARCHAR(10), ABS(CHECKSUM(NEWID())));

    BEGIN TRANSACTION;
    BEGIN TRY
        INSERT INTO TutorInvoice (
            InvoiceNumber, TutorId, ScheduleId, TutorTotalPayment,
            Month, Year, EmailSentDate, IsActive, CreatedBy, CreatedDate
        )
        VALUES (
            @InvoiceNumber, @TutorId, @FirstScheduleId, @TotalPayment,
            @InputMonth, @InputYear, NULL, 1, @CreatedBy, @Now
        );

        SET @InvoiceId = SCOPE_IDENTITY();

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
                  AND SCD2.Status = 'Class Completed'
                  AND EXISTS (SELECT 1 FROM @OpsApproved OA WHERE OA.Id = SCD2.OperationScheduleStatus)
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
          AND SCD.Status = 'Class Completed'
          AND EXISTS (SELECT 1 FROM @OpsApproved OA WHERE OA.Id = SCD.OperationScheduleStatus);

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;

    SELECT @InvoiceId AS InvoiceId,
           @TotalPayment AS TotalPayment,
           @InvoiceNumber AS InvoiceNumber;
END;

GO
