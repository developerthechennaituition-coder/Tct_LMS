-- Chat → "Delete for me": one row per (message, user) that hides the message from that user's view only.
-- Additive only, re-runnable. Run in the intended LMS database, after taking a backup.
--   • dbo.MessageUserDeletion.MessageId = dbo.Messages.MessageId (the INT key the chat UI already uses).
-- "Delete for everyone" needs no schema change: it reuses dbo.Messages.IsDeleted.
-- Existing tables and rows are untouched.
SET XACT_ABORT ON;
BEGIN TRY
BEGIN TRANSACTION;

IF NOT EXISTS (
    SELECT 1 FROM sys.tables t
    JOIN sys.schemas s ON t.schema_id = s.schema_id
    WHERE t.name = 'MessageUserDeletion' AND s.name = 'dbo'
)
BEGIN
    CREATE TABLE [dbo].[MessageUserDeletion]
    (
        [Id] UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT PK_MessageUserDeletion PRIMARY KEY
            CONSTRAINT DF_MessageUserDeletion_Id DEFAULT NEWID(),
        [MessageId] INT NOT NULL,
        [UserId] UNIQUEIDENTIFIER NOT NULL,
        [DeletedAt] DATETIME2 NOT NULL
            CONSTRAINT DF_MessageUserDeletion_DeletedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_MessageUserDeletion_Message_User UNIQUE ([MessageId], [UserId])
    );
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_MessageUserDeletion_UserId' AND object_id = OBJECT_ID('dbo.MessageUserDeletion'))
    CREATE INDEX IX_MessageUserDeletion_UserId ON [dbo].[MessageUserDeletion] ([UserId]) INCLUDE ([MessageId]);

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
