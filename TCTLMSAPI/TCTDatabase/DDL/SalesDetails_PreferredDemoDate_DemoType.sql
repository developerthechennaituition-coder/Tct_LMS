-- Enroll New Course / Edit Enrolled Course → "Preferred Demo Date" and "Demo Type" (Free / Paid).
--   DemoDate   DATE NULL : Preferred Demo Date requested at enrollment. It is not a booking; the actual
--                          demo date is the date of the schedule saved from Schedule Demo.
--                          (Same column as SalesDetails_DemoDate.sql; added here only if that script was never run.)
--   IsPaidDemo BIT  NULL : 1 = Paid Demo, 0 = Free Demo, NULL = not specified (courses enrolled before this release).
-- Additive only. Re-runnable. Every existing row is kept unchanged (NULL); nothing is dropped or deleted.
-- Must be run on the LMS database BEFORE the API build that maps SalesDetails.DemoDate / IsPaidDemo is deployed.
SET XACT_ABORT ON;
BEGIN TRY
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.SalesDetails') IS NULL
    THROW 50003, 'dbo.SalesDetails does not exist; nothing was changed.', 1;

IF COL_LENGTH('dbo.SalesDetails', 'DemoDate') IS NULL
BEGIN
    ALTER TABLE [dbo].[SalesDetails] ADD [DemoDate] DATE NULL;
END

IF COL_LENGTH('dbo.SalesDetails', 'IsPaidDemo') IS NULL
BEGIN
    ALTER TABLE [dbo].[SalesDetails] ADD [IsPaidDemo] BIT NULL;
END

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
