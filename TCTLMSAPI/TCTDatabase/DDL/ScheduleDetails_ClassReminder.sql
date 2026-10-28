IF COL_LENGTH('dbo.ScheduleDetails', 'ClassReminderSentDate') IS NULL
BEGIN
    ALTER TABLE dbo.ScheduleDetails
        ADD ClassReminderSentDate DATETIME2 NULL;
END;

