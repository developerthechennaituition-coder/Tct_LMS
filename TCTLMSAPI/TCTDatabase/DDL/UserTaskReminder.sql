-- My Calendar → Tasks: deadline reminders (D-7, D-1, due date, overdue).
-- Additive only, re-runnable. Run after UserTask.sql and UserTask_Verification.sql, in the intended LMS database,
-- after taking a backup, and BEFORE deploying the API build that maps UserTaskReminder (the reminder job reads it).
--   • dbo.UserTaskReminder — one row per reminder sent: task, recipient, milestone, notification, time sent.
--     The unique index UX_UserTaskReminder_Task_Recipient_Milestone lets each reminder be sent only once, also after
--     an API restart or when the reminder job runs on several API instances.
-- No existing table, column, constraint or row is changed. The deadline state shown in the UI is calculated from
-- UserTask.DueDate / DueTime and is not stored.
SET XACT_ABORT ON;
BEGIN TRY
BEGIN TRANSACTION;

IF NOT EXISTS (
    SELECT 1 FROM sys.tables t
    JOIN sys.schemas s ON t.schema_id = s.schema_id
    WHERE t.name = 'UserTaskReminder' AND s.name = 'dbo'
)
BEGIN
    CREATE TABLE [dbo].[UserTaskReminder] (
        [Id]               UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
        [UserTaskId]       UNIQUEIDENTIFIER    NOT NULL,   -- dbo.UserTask.Id
        [RecipientUserId]  UNIQUEIDENTIFIER    NOT NULL,   -- dbo.[User].Id (the assignee)
        [Milestone]        NVARCHAR(20)        NOT NULL,   -- D-7 / D-1 / D0 / Overdue
        [NotificationId]   UNIQUEIDENTIFIER    NOT NULL,   -- dbo.Notification.Id of the reminder
        [SentDate]         DATETIME2           NOT NULL DEFAULT GETUTCDATE(),

        CONSTRAINT PK_UserTaskReminder PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT FK_UserTaskReminder_UserTask FOREIGN KEY ([UserTaskId]) REFERENCES [dbo].[UserTask]([Id]),
        CONSTRAINT FK_UserTaskReminder_Recipient FOREIGN KEY ([RecipientUserId]) REFERENCES [dbo].[User]([Id]),
        CONSTRAINT CK_UserTaskReminder_Milestone CHECK ([Milestone] IN ('D-7', 'D-1', 'D0', 'Overdue'))
    );

    CREATE UNIQUE INDEX UX_UserTaskReminder_Task_Recipient_Milestone
        ON [dbo].[UserTaskReminder]([UserTaskId], [RecipientUserId], [Milestone]);
END

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
