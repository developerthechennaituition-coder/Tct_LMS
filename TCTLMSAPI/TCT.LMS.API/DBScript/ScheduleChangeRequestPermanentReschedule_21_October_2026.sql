-- Calendar "Request for Re-schedule" chosen as Permanent: the request waits in Schedule Calendar > Requests to approve.
-- RequestKind: NULL = add class day(s) (existing requests), 'PermanentReschedule' = move a weekly class to a new day/time.
-- ScheduleDetailsId: the class the re-schedule was requested on. FromDate/Days/StartTime/EndTime hold the new slot.
-- Adds two nullable columns only; existing rows are unchanged. Safe to re-run. Run after ScheduleChangeRequest_21_October_2026.sql.
SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF COL_LENGTH('dbo.ScheduleChangeRequest', 'RequestKind') IS NULL
    ALTER TABLE dbo.ScheduleChangeRequest ADD RequestKind NVARCHAR(20) NULL;

IF COL_LENGTH('dbo.ScheduleChangeRequest', 'ScheduleDetailsId') IS NULL
    ALTER TABLE dbo.ScheduleChangeRequest ADD ScheduleDetailsId UNIQUEIDENTIFIER NULL;

COMMIT TRANSACTION;
