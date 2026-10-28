/*
    Adds AnnualExamMonth (1-12) to StudentRegistration.

    Required for new registrations (enforced in the form/API), but the column is NULL-able
    so existing rows aren't forced to an invalid month. The upcoming class auto-schedule
    check treats NULL / unset as "not configured".

    Idempotent - safe to re-run.
*/
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.StudentRegistration')
      AND name = 'AnnualExamMonth'
)
BEGIN
    ALTER TABLE dbo.StudentRegistration
        ADD AnnualExamMonth INT NULL;
END
GO
