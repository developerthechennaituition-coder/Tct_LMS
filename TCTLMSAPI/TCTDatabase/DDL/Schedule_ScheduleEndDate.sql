/* Academic closing date for recurring class schedules. Apply before deploying the API. */
IF COL_LENGTH('dbo.Schedule', 'ScheduleEndDate') IS NULL
BEGIN
    ALTER TABLE dbo.Schedule ADD ScheduleEndDate DATETIME2 NULL;
END
GO

/* Existing recurring records have no explicit academic closing date. Backfill
   only those whose NoOfMonths is known; never infer a duration from EndDate. */
UPDATE dbo.Schedule
SET ScheduleEndDate = DATEADD(MONTH, NoOfMonths, CAST(StartDate AS date))
WHERE ScheduleEndDate IS NULL
  AND NoOfMonths BETWEEN 1 AND 10
  AND ScheduleMode = 'Weekly';
GO
