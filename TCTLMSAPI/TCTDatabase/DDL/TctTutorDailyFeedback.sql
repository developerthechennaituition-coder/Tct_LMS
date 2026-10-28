IF NOT EXISTS (
    SELECT 1 FROM sys.tables t
    JOIN sys.schemas s ON t.schema_id = s.schema_id
    WHERE t.name = 'TctTutorDailyFeedback' AND s.name = 'dbo'
)
BEGIN
    CREATE TABLE [dbo].[TctTutorDailyFeedback] (
        [Id]                UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
        [UserId]            UNIQUEIDENTIFIER    NOT NULL,
        [FeelingRating]     NVARCHAR(20)        NOT NULL,
        [Comments]          NVARCHAR(MAX)       NULL,
        [IsFlaggedForReview] BIT                NOT NULL DEFAULT 0,
        [CreatedOnUtc]      DATETIME2           NOT NULL DEFAULT GETUTCDATE(),
        [CreatedByUserId]   UNIQUEIDENTIFIER    NULL,

        CONSTRAINT PK_TctTutorDailyFeedback PRIMARY KEY CLUSTERED ([Id])
    );
END
GO
