-- Tutor class cancellation and re-scheduling rules (TutorCancellationRules in the API):
--   - per tutor (all their classes) and calendar month, a tutor may set Class Cancelled (1009002) on as many
--     regular classes as TutorCancelAllowedPerMonth_Weekly<N> allows for the tutor's N classes a week; a band applies
--     from N up to the next band, so higher bands (_Weekly8, _Weekly12, ...) can be added in Threshold Configuration;
--   - each cancelled class needs its own make-up class: a Schedule Calendar make-up request approved by Operations,
--     or the existing Reschedule Class flow;
--   - a tutor-cancelled class without an approved make-up by the end of its month is deducted at that month's
--     payroll: TutorCancelUnrescheduledDeductionPercent of the class's pay.
-- Additive only and re-runnable:
--   1. creates dbo.TutorCancellationTracking (one row per cancelled class) with unique indexes so a class is
--      tracked once, a make-up class satisfies one cancellation only, and a deduction is applied once;
--   2. adds the nine Threshold Configuration rows, only where a row with that ThresholdName does not exist yet.
-- No existing table, row, threshold value or index is changed. Run on the LMS database after taking a backup,
-- BEFORE deploying the API build that uses the table: until the rows exist, tutor cancellations are refused (fail safe).

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- 1. Tracking table ---------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.TutorCancellationTracking', 'U') IS NULL
    CREATE TABLE [dbo].[TutorCancellationTracking] (
        [Id]                      UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_TutorCancellationTracking] PRIMARY KEY,
        [ScheduleDetailsId]       UNIQUEIDENTIFIER NOT NULL,
        [SalesDetailsId]          UNIQUEIDENTIFIER NOT NULL,
        [TutorId]                 UNIQUEIDENTIFIER NOT NULL,   -- Tutor.Id
        [Category]                NVARCHAR(20)     NOT NULL,   -- 'tutor' or 'student'
        [CountsAgainstAllowance]  BIT              NOT NULL,
        [ClassDate]               DATETIME2        NOT NULL,
        [CancelledBy]             UNIQUEIDENTIFIER NOT NULL,
        [CancelledAt]             DATETIME2        NOT NULL,
        [IsActive]                BIT              NOT NULL,
        [MakeupRequestId]         UNIQUEIDENTIFIER NULL,
        [MakeupScheduleDetailsId] UNIQUEIDENTIFIER NULL,
        [RescheduledByType]       NVARCHAR(20)     NULL,
        [RescheduledAt]           DATETIME2        NULL,
        [DeductionAmount]         DECIMAL(18, 2)   NULL,
        [DeductionInvoiceId]      BIGINT           NULL,
        [DeductedAt]              DATETIME2        NULL,
        [TutorNotifiedAt]         DATETIME2        NULL,
        [ModifiedDate]            DATETIME2        NULL
    );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_TutorCancellationTracking_Class'
               AND object_id = OBJECT_ID('dbo.TutorCancellationTracking'))
    CREATE UNIQUE NONCLUSTERED INDEX [UX_TutorCancellationTracking_Class]
        ON [dbo].[TutorCancellationTracking] ([ScheduleDetailsId]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_TutorCancellationTracking_Makeup'
               AND object_id = OBJECT_ID('dbo.TutorCancellationTracking'))
    CREATE UNIQUE NONCLUSTERED INDEX [UX_TutorCancellationTracking_Makeup]
        ON [dbo].[TutorCancellationTracking] ([MakeupScheduleDetailsId])
        WHERE [MakeupScheduleDetailsId] IS NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_TutorCancellationTracking_CourseMonth'
               AND object_id = OBJECT_ID('dbo.TutorCancellationTracking'))
    CREATE NONCLUSTERED INDEX [IX_TutorCancellationTracking_CourseMonth]
        ON [dbo].[TutorCancellationTracking] ([SalesDetailsId], [ClassDate])
        INCLUDE ([Category], [CountsAgainstAllowance], [IsActive]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_TutorCancellationTracking_TutorMonth'
               AND object_id = OBJECT_ID('dbo.TutorCancellationTracking'))
    CREATE NONCLUSTERED INDEX [IX_TutorCancellationTracking_TutorMonth]
        ON [dbo].[TutorCancellationTracking] ([TutorId], [ClassDate])
        INCLUDE ([Category], [CountsAgainstAllowance], [IsActive], [DeductionInvoiceId]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_TutorCancellationTracking_Rescheduled'
               AND object_id = OBJECT_ID('dbo.TutorCancellationTracking'))
    CREATE NONCLUSTERED INDEX [IX_TutorCancellationTracking_Rescheduled]
        ON [dbo].[TutorCancellationTracking] ([RescheduledAt])
        WHERE [MakeupScheduleDetailsId] IS NOT NULL;
GO

-- 2. Threshold Configuration rows --------------------------------------------------------------------------
SET XACT_ABORT ON;
BEGIN TRANSACTION;

INSERT INTO dbo.Thresholds (Id, EntityType, GroupKey, ThresholdName, Value, Unit, Description, IsActive, CreatedDate, CreatedBy)
SELECT NEWID(), 'Tutor', 'TutorCancellation', v.ThresholdName, v.Value, v.Unit, v.Description, 1, GETDATE(),
       '00000000-0000-0000-0000-000000000000'
FROM (VALUES
    ('TutorCancelWeeksPerMonth',                 4,  'weeks',   'Monthly classes = classes a week x this'),
    ('TutorCancelAllowedPerMonth_Weekly1',       1,  'count',   'Tutor cancellations allowed a month for 1 class a week (4 a month)'),
    ('TutorCancelAllowedPerMonth_Weekly2',       1,  'count',   'Tutor cancellations allowed a month for 2 classes a week (8 a month)'),
    ('TutorCancelAllowedPerMonth_Weekly3',       2,  'count',   'Tutor cancellations allowed a month for 3 classes a week (12 a month)'),
    ('TutorCancelAllowedPerMonth_Weekly4',       2,  'count',   'Tutor cancellations allowed a month for 4 classes a week (16 a month)'),
    ('TutorCancelAllowedPerMonth_Weekly5',       3,  'count',   'Tutor cancellations allowed a month for 5 classes a week (20 a month)'),
    ('TutorCancelAllowedPerMonth_Weekly6',       3,  'count',   'Tutor cancellations allowed a month for 6 classes a week (24 a month)'),
    ('TutorCancelAllowedPerMonth_Weekly7',       3,  'count',   'Tutor cancellations allowed a month for 7 or more classes a week, until a higher band is added (e.g. TutorCancelAllowedPerMonth_Weekly8)'),
    ('TutorCancelUnrescheduledDeductionPercent', 50, 'percent', 'Share of a class''s fee deducted when a tutor-cancelled class is not re-scheduled by month end')
) AS v (ThresholdName, Value, Unit, Description)
WHERE NOT EXISTS (SELECT 1 FROM dbo.Thresholds t WHERE t.ThresholdName = v.ThresholdName);

COMMIT TRANSACTION;
GO
