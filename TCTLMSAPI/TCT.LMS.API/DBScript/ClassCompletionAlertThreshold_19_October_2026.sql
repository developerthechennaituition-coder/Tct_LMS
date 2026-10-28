-- Adds the "ClassCompletionAlertPercent" threshold (Threshold Configuration screen).
-- When this percentage of a month's scheduled classes for a student's subject is completed,
-- every Accounts / Accounts Admin user gets a "Class Completion Threshold" notification
-- (once per subject and month). Change Value in Threshold Configuration; 0 or inactive turns it off.
-- Data only: no schema change. Safe to re-run.
SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF NOT EXISTS (SELECT 1 FROM dbo.Thresholds WHERE ThresholdName = 'ClassCompletionAlertPercent')
    INSERT INTO dbo.Thresholds (Id, EntityType, GroupKey, ThresholdName, Value, Unit, Description, IsActive, CreatedDate, CreatedBy)
    VALUES (NEWID(), 'Student', 'AccountsAlert', 'ClassCompletionAlertPercent', 90, 'percent',
            'Notify Accounts when this % of a month''s classes are completed', 1, GETDATE(),
            '00000000-0000-0000-0000-000000000000');

COMMIT TRANSACTION;
