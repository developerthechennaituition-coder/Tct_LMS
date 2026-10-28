-- My Calendar → demo status workflow.
-- Additive only. Re-runnable. Run in the intended LMS database after taking a backup.
--   1. Four follow-up statuses that did not exist, added to the existing "Status" lookup (TypeGroupCode 200)
--      with unused codes 20045-20048. Existing statuses are not changed.
--   2. The seven demo dropout reasons, added to the existing, empty "DropoutReason" lookup (TypeGroupCode 1008).
--      The existing "DropoutRatioReasons" (900) values are not changed.
--   3. dbo.DemoStatusHistory: one row per status change made from My Calendar (status, follow-up date range,
--      dropout reason, who, when). SalesDetails keeps holding the current status.
SET XACT_ABORT ON;
BEGIN TRY
BEGIN TRANSACTION;

DECLARE @SeedUser UNIQUEIDENTIFIER = '3F2504E0-4F89-11D3-9A0C-0305E82C3301'; -- same CreatedBy as the existing seed lookups
DECLARE @StatusGroup UNIQUEIDENTIFIER = (SELECT Id FROM dbo.TypeGroup WHERE TypeGroupCode = 200);
DECLARE @ReasonGroup UNIQUEIDENTIFIER = (SELECT Id FROM dbo.TypeGroup WHERE TypeGroupCode = 1008);
IF @StatusGroup IS NULL OR @ReasonGroup IS NULL
    THROW 50001, 'Lookup group 200 (Status) or 1008 (DropoutReason) is missing; nothing was changed.', 1;

DECLARE @Codes TABLE (GroupId UNIQUEIDENTIFIER, Value INT, Name NVARCHAR(200));
INSERT @Codes VALUES
    (@StatusGroup, 20045, N'2nd Re-Demo'),
    (@StatusGroup, 20046, N'Demo Cancelled Tutor Not Available'),
    (@StatusGroup, 20047, N'Demo Cancelled Parent Not Available'),
    (@StatusGroup, 20048, N'No-Demo Taken/Sales Follow-up'),
    (@ReasonGroup, 1008001, N'Teached Quality'),
    (@ReasonGroup, 1008002, N'Payment Issue'),
    (@ReasonGroup, 1008003, N'Timing Issue'),
    (@ReasonGroup, 1008004, N'TCT Issue'),
    (@ReasonGroup, 1008005, N'Parent Issue'),
    (@ReasonGroup, 1008006, N'Went to another tutor'),
    (@ReasonGroup, 1008007, N'Looking for Offline');

INSERT INTO dbo.Type_Code (Id, TypeGroupId, TypeCodeValue, TypeCodeName, TypeCodeDescription, IsActive, CreatedBy, CreatedDate, IsSystemDefault)
SELECT NEWID(), c.GroupId, c.Value, c.Name, c.Name, 1, @SeedUser, GETDATE(), 1
FROM @Codes c
WHERE NOT EXISTS (SELECT 1 FROM dbo.Type_Code t WHERE t.TypeCodeValue = c.Value);

IF NOT EXISTS (
    SELECT 1 FROM sys.tables t
    JOIN sys.schemas s ON t.schema_id = s.schema_id
    WHERE t.name = 'DemoStatusHistory' AND s.name = 'dbo'
)
BEGIN
    CREATE TABLE [dbo].[DemoStatusHistory] (
        [Id]                 UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWSEQUENTIALID(),
        [SalesDetailsId]     UNIQUEIDENTIFIER  NOT NULL,   -- the enrolment (course) the demo belongs to
        [StatusId]           UNIQUEIDENTIFIER  NOT NULL,   -- Type_Code.Id (group 200) set by this change
        [PreviousStatusId]   UNIQUEIDENTIFIER  NULL,       -- SalesDetails.Status before this change
        [FollowUpStartDate]  DATE              NULL,
        [FollowUpEndDate]    DATE              NULL,
        [DropoutReasonId]    UNIQUEIDENTIFIER  NULL,       -- Type_Code.Id (group 1008), DC Dropped only
        [CreatedBy]          UNIQUEIDENTIFIER  NOT NULL,   -- signed-in user (from the login token)
        [CreatedDate]        DATETIME2         NOT NULL DEFAULT GETUTCDATE(),
        [IsActive]           BIT               NOT NULL DEFAULT 1,

        CONSTRAINT PK_DemoStatusHistory PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT FK_DemoStatusHistory_SalesDetails FOREIGN KEY ([SalesDetailsId]) REFERENCES [dbo].[SalesDetails]([Id]),
        CONSTRAINT FK_DemoStatusHistory_Status FOREIGN KEY ([StatusId]) REFERENCES [dbo].[Type_Code]([Id]),
        CONSTRAINT FK_DemoStatusHistory_Reason FOREIGN KEY ([DropoutReasonId]) REFERENCES [dbo].[Type_Code]([Id]),
        CONSTRAINT CK_DemoStatusHistory_Range CHECK ([FollowUpEndDate] IS NULL OR [FollowUpStartDate] IS NULL OR [FollowUpEndDate] >= [FollowUpStartDate])
    );

    CREATE INDEX IX_DemoStatusHistory_SalesDetails ON [dbo].[DemoStatusHistory]([SalesDetailsId], [CreatedDate] DESC);
    CREATE INDEX IX_DemoStatusHistory_Range ON [dbo].[DemoStatusHistory]([FollowUpStartDate], [FollowUpEndDate]) INCLUDE ([SalesDetailsId], [StatusId]);
END

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
