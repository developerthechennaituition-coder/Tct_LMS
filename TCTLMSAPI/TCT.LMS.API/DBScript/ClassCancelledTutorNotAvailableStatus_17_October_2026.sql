-- Adds "Class Cancelled Tutor Not Available" (1009007) to the Class Status Type lookup (TypeGroupCode 1009).
-- The application already handles 1009007 (calendar colour, cancellation rules, reminders); only the
-- lookup row was missing, so the status was not offered in the class status dropdown.
-- Data only: no schema change. Safe to re-run.
SET XACT_ABORT ON;
BEGIN TRANSACTION;

DECLARE @ClassStatusGroupId uniqueidentifier =
    (SELECT Id FROM dbo.TypeGroup WHERE TypeGroupCode = 1009);

IF @ClassStatusGroupId IS NULL
    THROW 50001, 'TypeGroup 1009 (Class Status Type) not found.', 1;

INSERT INTO dbo.Type_Code (Id, TypeGroupId, TypeCodeValue, TypeCodeName, TypeCodeDescription, IsActive, CreatedBy, CreatedDate, IsSystemDefault)
SELECT NEWID(), @ClassStatusGroupId, v.TypeCodeValue, v.TypeCodeName, v.TypeCodeName, 1,
       '00000000-0000-0000-0000-000000000000', GETDATE(), 0
FROM (VALUES
    (1009007, N'Class Cancelled Tutor Not Available')
) AS v (TypeCodeValue, TypeCodeName)
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.Type_Code tc
    WHERE tc.TypeGroupId = @ClassStatusGroupId AND tc.TypeCodeValue = v.TypeCodeValue
);

COMMIT TRANSACTION;
