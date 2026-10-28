-- My Calendar → single "Remind Me" date for the follow-up statuses.
-- Additive only. Re-runnable. Requires TCTDatabase/DDL/DemoStatusWorkflow.sql to have been run first.
-- Adds dbo.DemoStatusHistory.ReminderDate. The existing FollowUpStartDate / FollowUpEndDate columns and
-- every existing row are kept unchanged (older date-range rows are shown on their start date).
SET XACT_ABORT ON;
BEGIN TRY
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.DemoStatusHistory') IS NULL
    THROW 50002, 'dbo.DemoStatusHistory does not exist. Run DemoStatusWorkflow.sql first; nothing was changed.', 1;

IF COL_LENGTH('dbo.DemoStatusHistory', 'ReminderDate') IS NULL
BEGIN
    ALTER TABLE [dbo].[DemoStatusHistory] ADD [ReminderDate] DATE NULL;
END

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_DemoStatusHistory_Reminder' AND object_id = OBJECT_ID('dbo.DemoStatusHistory'))
    CREATE INDEX IX_DemoStatusHistory_Reminder ON [dbo].[DemoStatusHistory]([ReminderDate]) INCLUDE ([SalesDetailsId], [StatusId]);
GO
