/*
    Adds NoOfMonths (1-10) to Schedule.

    Captured during class scheduling as the academic duration (1-10 months).
    The initial EndDate is selected independently. ScheduleEndDate is derived
    from StartDate + NoOfMonths by Schedule_ScheduleEndDate.sql.

    NULL-able so existing schedule rows are unaffected. Idempotent - safe to re-run.
*/
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.Schedule')
      AND name = 'NoOfMonths'
)
BEGIN
    ALTER TABLE dbo.Schedule
        ADD NoOfMonths INT NULL;
END
GO
