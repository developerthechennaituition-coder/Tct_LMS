-- My Calendar → Tasks: deadline time + task verification workflow.
-- Additive only, re-runnable. Run after UserTask.sql, in the intended LMS database, after taking a backup.
--   • dbo.UserTask.DueTime         TIME(0) NULL   — time of day of the deadline (NULL = date-only, as before).
--   • dbo.UserTask.WorkflowStatus  NVARCHAR(30) NULL — InProgress / PendingVerification / ChangesRequested / Verified.
--     NULL keeps the existing meaning of Status (Pending = Assigned, Completed = Completed, not yet submitted).
--     The existing Status column, its values and CK_UserTask_Status are not changed.
--   • dbo.UserTaskVerificationHistory — one row per workflow action (who, when, previous/new status, comments).
-- Proof files are stored in the existing dbo.Document / dbo.DocumentStorage tables
-- (Document.ReferenceId = UserTaskVerificationHistory.Id, DocumentTypeId = A0000000-0000-0000-0000-000000000003).
-- Existing rows are untouched: both new UserTask columns are NULL for them.
SET XACT_ABORT ON;
BEGIN TRY
BEGIN TRANSACTION;

IF COL_LENGTH('dbo.UserTask', 'DueTime') IS NULL
    ALTER TABLE [dbo].[UserTask] ADD [DueTime] TIME(0) NULL;

IF COL_LENGTH('dbo.UserTask', 'WorkflowStatus') IS NULL
    ALTER TABLE [dbo].[UserTask] ADD [WorkflowStatus] NVARCHAR(30) NULL;

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO

SET XACT_ABORT ON;
BEGIN TRY
BEGIN TRANSACTION;

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_UserTask_WorkflowStatus')
    ALTER TABLE [dbo].[UserTask] ADD CONSTRAINT CK_UserTask_WorkflowStatus
        CHECK ([WorkflowStatus] IS NULL OR [WorkflowStatus] IN ('InProgress', 'PendingVerification', 'ChangesRequested', 'Verified'));

IF NOT EXISTS (
    SELECT 1 FROM sys.tables t
    JOIN sys.schemas s ON t.schema_id = s.schema_id
    WHERE t.name = 'UserTaskVerificationHistory' AND s.name = 'dbo'
)
BEGIN
    CREATE TABLE [dbo].[UserTaskVerificationHistory] (
        [Id]                 UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
        [UserTaskId]         UNIQUEIDENTIFIER    NOT NULL,   -- dbo.UserTask.Id
        [Action]             NVARCHAR(30)        NOT NULL,   -- Started / Submitted / Resubmitted / Verified / ChangesRequested
        [PreviousStatus]     NVARCHAR(30)        NOT NULL,   -- Assigned / InProgress / Completed / PendingVerification / ChangesRequested
        [NewStatus]          NVARCHAR(30)        NOT NULL,
        [Comments]           NVARCHAR(2000)      NULL,       -- completion notes (employee) or verification comment (verifier)
        [PerformedByUserId]  UNIQUEIDENTIFIER    NOT NULL,   -- dbo.[User].Id (from the signed-in user)
        [PerformedDate]      DATETIME2           NOT NULL DEFAULT GETUTCDATE(),
        [NotificationId]     UNIQUEIDENTIFIER    NULL,       -- dbo.Notification.Id sent for this action, if any

        [CreatedBy]          UNIQUEIDENTIFIER    NOT NULL,
        [CreatedDate]        DATETIME2           NOT NULL DEFAULT GETUTCDATE(),
        [ModifiedBy]         UNIQUEIDENTIFIER    NULL,
        [ModifiedDate]       DATETIME2           NULL,
        [IsActive]           BIT                 NOT NULL DEFAULT 1,

        CONSTRAINT PK_UserTaskVerificationHistory PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT FK_UserTaskVerificationHistory_UserTask FOREIGN KEY ([UserTaskId]) REFERENCES [dbo].[UserTask]([Id]),
        CONSTRAINT FK_UserTaskVerificationHistory_PerformedBy FOREIGN KEY ([PerformedByUserId]) REFERENCES [dbo].[User]([Id])
    );

    CREATE INDEX IX_UserTaskVerificationHistory_UserTaskId ON [dbo].[UserTaskVerificationHistory]([UserTaskId]) INCLUDE ([PerformedDate]);
END

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
