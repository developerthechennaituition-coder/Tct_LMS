-- Profile → "Time zone": the user's IANA timezone ID (e.g. America/New_York), set by the user or an authorised coordinator.
-- Additive only. Re-runnable. Adds dbo.[User].TimeZoneId (nullable); every existing row is kept unchanged (NULL = not set).
-- No backfill: a timezone is never inferred from Location, Address.Country or nationality.
-- Must be run on the LMS database BEFORE the API build that maps User.TimeZoneId is deployed;
-- otherwise every query that reads dbo.[User] (including login) fails.
-- Single batch: if either guard fails, THROW ends the batch, so neither the ALTER nor the confirmation runs.
DECLARE @ExpectedServer sysname = N'CrazyLoki\SQLEXPRESS';
DECLARE @ExpectedDatabase sysname = N'TheChennaiTuitionQAV1_final';
DECLARE @ActualServerName sysname = @@SERVERNAME;                                  -- from sys.servers (can be stale or NULL)
DECLARE @ActualServerProperty sysname = CAST(SERVERPROPERTY('ServerName') AS sysname); -- current machine\instance
DECLARE @GuardMessage nvarchar(2048);

-- NULL never passes: a missing value is a mismatch, not a match.
IF @ActualServerName IS NULL OR @ActualServerProperty IS NULL
   OR @ActualServerName <> @ExpectedServer OR @ActualServerProperty <> @ExpectedServer
BEGIN
    SET @GuardMessage = CONCAT(N'Wrong server: expected ', @ExpectedServer, N'; @@SERVERNAME = ', ISNULL(@ActualServerName, N'NULL'),
        N', SERVERPROPERTY(''ServerName'') = ', ISNULL(@ActualServerProperty, N'NULL'), N'. Nothing was changed.');
    THROW 51001, @GuardMessage, 1;
END

IF DB_NAME() IS NULL OR DB_NAME() <> @ExpectedDatabase
BEGIN
    SET @GuardMessage = CONCAT(N'Wrong database: expected ', @ExpectedDatabase, N'; connected to ', ISNULL(DB_NAME(), N'NULL'), N'. Nothing was changed.');
    THROW 51000, @GuardMessage, 1;
END

SET XACT_ABORT ON;
BEGIN TRY
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.[User]') IS NULL
    THROW 50003, 'dbo.[User] does not exist; nothing was changed.', 1;

IF COL_LENGTH('dbo.[User]', 'TimeZoneId') IS NULL
BEGIN
    ALTER TABLE [dbo].[User] ADD [TimeZoneId] NVARCHAR(64) NULL;
END
ELSE IF NOT EXISTS (SELECT 1 FROM sys.columns
                    WHERE object_id = OBJECT_ID('dbo.[User]') AND name = 'TimeZoneId'
                      AND TYPE_NAME(user_type_id) = 'nvarchar' AND max_length = 128 AND is_nullable = 1)
    THROW 50004, 'dbo.[User].TimeZoneId already exists with a different definition; nothing was changed.', 1;

COMMIT TRANSACTION;

    -- Read-only confirmation: reached only when both guards passed and the schema step committed.
    SELECT c.name AS ColumnName, TYPE_NAME(c.user_type_id) AS DataType, c.max_length / 2 AS MaxLength, c.is_nullable AS IsNullable
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID('dbo.[User]') AND c.name = 'TimeZoneId';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
