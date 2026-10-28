-- My Calendar → Tasks: tasks assigned by one staff user to another.
-- Additive only: creates dbo.UserTask if it does not exist. No existing table or data is changed.
-- Re-runnable. Run in the intended LMS database after taking a backup.
SET XACT_ABORT ON;
BEGIN TRY
BEGIN TRANSACTION;

IF NOT EXISTS (
    SELECT 1 FROM sys.tables t
    JOIN sys.schemas s ON t.schema_id = s.schema_id
    WHERE t.name = 'UserTask' AND s.name = 'dbo'
)
BEGIN
    CREATE TABLE [dbo].[UserTask] (
        [Id]                       UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
        [Title]                    NVARCHAR(200)       NOT NULL,
        [Description]              NVARCHAR(2000)      NOT NULL,
        [AssignedToUserId]         UNIQUEIDENTIFIER    NOT NULL,   -- dbo.[User].Id (recipient)
        [AssignedByUserId]         UNIQUEIDENTIFIER    NOT NULL,   -- dbo.[User].Id (from the signed-in user)
        [DueDate]                  DATETIME2           NOT NULL,
        [Priority]                 NVARCHAR(20)        NULL,       -- Low / Medium / High
        [Status]                   NVARCHAR(20)        NOT NULL DEFAULT 'Pending',  -- Pending / Completed
        [CompletedDate]            DATETIME2           NULL,
        [CompletedByUserId]        UNIQUEIDENTIFIER    NULL,
        [AssignedNotificationId]   UNIQUEIDENTIFIER    NULL,       -- dbo.Notification.Id sent to the assignee
        [CompletedNotificationId]  UNIQUEIDENTIFIER    NULL,       -- dbo.Notification.Id sent to the assigner

        [CreatedBy]                UNIQUEIDENTIFIER    NOT NULL,
        [CreatedDate]              DATETIME2           NOT NULL DEFAULT GETUTCDATE(),
        [ModifiedBy]               UNIQUEIDENTIFIER    NULL,
        [ModifiedDate]             DATETIME2           NULL,
        [IsActive]                 BIT                 NOT NULL DEFAULT 1,

        CONSTRAINT PK_UserTask PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT FK_UserTask_AssignedTo FOREIGN KEY ([AssignedToUserId]) REFERENCES [dbo].[User]([Id]),
        CONSTRAINT FK_UserTask_AssignedBy FOREIGN KEY ([AssignedByUserId]) REFERENCES [dbo].[User]([Id]),
        CONSTRAINT CK_UserTask_Status CHECK ([Status] IN ('Pending', 'Completed'))
    );

    CREATE INDEX IX_UserTask_AssignedToUserId ON [dbo].[UserTask]([AssignedToUserId]) INCLUDE ([Status], [DueDate]);
    CREATE INDEX IX_UserTask_AssignedByUserId ON [dbo].[UserTask]([AssignedByUserId]) INCLUDE ([Status], [DueDate]);
END

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
