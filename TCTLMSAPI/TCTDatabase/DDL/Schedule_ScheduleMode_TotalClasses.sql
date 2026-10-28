/*
    Adds the schedule creation mode and optional fixed occurrence count.
    Idempotent and safe for existing schedules.
*/
IF COL_LENGTH('dbo.Schedule', 'ScheduleMode') IS NULL
BEGIN
    ALTER TABLE dbo.Schedule ADD ScheduleMode NVARCHAR(20) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE name = 'CK_Schedule_ScheduleMode'
      AND parent_object_id = OBJECT_ID('dbo.Schedule')
)
BEGIN
    ALTER TABLE dbo.Schedule
        ADD CONSTRAINT CK_Schedule_ScheduleMode
        -- 'Temporary' added 21-Oct-2026 (Schedule Calendar 1-4 week changes); see DBScript/ScheduleModeTemporary_21_October_2026.sql.
        CHECK (ScheduleMode IS NULL OR ScheduleMode IN ('OneTime', 'Weekly', 'FixedCount', 'Temporary'));
END
GO

IF COL_LENGTH('dbo.Schedule', 'TotalClasses') IS NULL
BEGIN
    ALTER TABLE dbo.Schedule ADD TotalClasses INT NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE name = 'CK_Schedule_TotalClasses_Positive'
      AND parent_object_id = OBJECT_ID('dbo.Schedule')
)
BEGIN
    ALTER TABLE dbo.Schedule
        ADD CONSTRAINT CK_Schedule_TotalClasses_Positive
        CHECK (TotalClasses IS NULL OR TotalClasses > 0);
END
GO
