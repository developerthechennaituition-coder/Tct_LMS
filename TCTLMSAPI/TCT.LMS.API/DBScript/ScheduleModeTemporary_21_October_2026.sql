-- Schedule Calendar: allow ScheduleMode = 'Temporary' (extra class days added by Operations for 1-4 weeks).
-- Next-month rollover copies only 'Weekly' schedules, so temporary days are not carried into later months.
-- Schema constraint only, no data change. Safe to re-run.
SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF EXISTS (SELECT 1 FROM sys.check_constraints
           WHERE name = 'CK_Schedule_ScheduleMode' AND parent_object_id = OBJECT_ID('dbo.Schedule'))
    ALTER TABLE dbo.Schedule DROP CONSTRAINT CK_Schedule_ScheduleMode;

ALTER TABLE dbo.Schedule
    ADD CONSTRAINT CK_Schedule_ScheduleMode
    CHECK (ScheduleMode IS NULL OR ScheduleMode IN ('OneTime', 'Weekly', 'FixedCount', 'Temporary'));

COMMIT TRANSACTION;
