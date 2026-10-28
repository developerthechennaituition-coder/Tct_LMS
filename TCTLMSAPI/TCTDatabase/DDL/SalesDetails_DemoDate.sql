-- Enroll New Course → "Demo Date" chosen by the Coordinator, shown on My Calendar.
-- Additive only. Re-runnable. Adds dbo.SalesDetails.DemoDate (nullable); every existing row is kept unchanged (NULL).
-- Must be run on the LMS database BEFORE the API build that maps SalesDetails.DemoDate is deployed.
SET XACT_ABORT ON;
BEGIN TRY
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.SalesDetails') IS NULL
    THROW 50003, 'dbo.SalesDetails does not exist; nothing was changed.', 1;

IF COL_LENGTH('dbo.SalesDetails', 'DemoDate') IS NULL
BEGIN
    ALTER TABLE [dbo].[SalesDetails] ADD [DemoDate] DATE NULL;
END

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SalesDetails_DemoDate' AND object_id = OBJECT_ID('dbo.SalesDetails'))
    CREATE INDEX IX_SalesDetails_DemoDate ON [dbo].[SalesDetails]([DemoDate]) INCLUDE ([Coordinator], [CreatedBy], [SalesId], [IsActive]) WHERE [DemoDate] IS NOT NULL;
GO
