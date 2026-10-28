-- Schedule.TutorRate: the hourly rate that pays this schedule's classes.
-- Set by the Tutor Change / Student Change approval, so classes taught by the original tutor keep the
-- original rate and the replacement tutor's schedule carries the replacement rate.
-- NULL (every existing schedule) means "use SalesDetails.TutorPayment", exactly as before.
-- Additive and re-runnable: adds one nullable column if it does not exist; no existing row is changed.
-- Run on the LMS database after taking a backup, BEFORE deploying the API build that maps Schedule.TutorRate
-- and before re-applying usp_GenerateTutorInvoice_HoursBased.sql.

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF COL_LENGTH('dbo.Schedule', 'TutorRate') IS NULL
BEGIN
    ALTER TABLE [dbo].[Schedule] ADD [TutorRate] DECIMAL(18, 2) NULL;
    PRINT 'dbo.Schedule.TutorRate added.';
END
ELSE
    PRINT 'dbo.Schedule.TutorRate already exists.';
GO

-- Verify
SELECT c.name, t.name AS type_name, c.precision, c.scale, c.is_nullable
FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id
WHERE c.object_id = OBJECT_ID('dbo.Schedule') AND c.name = 'TutorRate';
