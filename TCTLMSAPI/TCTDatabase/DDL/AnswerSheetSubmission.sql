IF NOT EXISTS (
    SELECT 1 FROM sys.tables t
    JOIN sys.schemas s ON t.schema_id = s.schema_id
    WHERE t.name = 'AnswerSheetSubmission' AND s.name = 'dbo'
)
BEGIN
    CREATE TABLE [dbo].[AnswerSheetSubmission] (
        [AnswerSheetSubmissionId]  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
        [TestScheduleId]           UNIQUEIDENTIFIER    NOT NULL,
        [StudentId]                UNIQUEIDENTIFIER    NOT NULL,

        -- The answer sheet file itself is stored via the shared Document/DocumentStorage tables
        -- (Document.ReferenceId = AnswerSheetSubmissionId).
        [SubmittedOn]              DATETIME2           NOT NULL,

        -- Evaluation must be completed within 1 day of SubmittedOn.
        [EvaluationStatus]         NVARCHAR(20)        NOT NULL DEFAULT 'Pending',
        [MarksObtained]            DECIMAL(6, 2)       NULL,
        [MaxMarks]                 DECIMAL(6, 2)       NULL,
        [Feedback]                 NVARCHAR(MAX)       NULL,
        [EvaluatedBy]              UNIQUEIDENTIFIER    NULL,
        [EvaluatedOn]              DATETIME2           NULL,

        [CreatedBy]                UNIQUEIDENTIFIER    NOT NULL,
        [CreatedDate]              DATETIME2           NOT NULL DEFAULT GETUTCDATE(),
        [ModifiedBy]               UNIQUEIDENTIFIER    NULL,
        [ModifiedDate]             DATETIME2           NULL,
        [IsActive]                 BIT                 NOT NULL DEFAULT 1,

        CONSTRAINT PK_AnswerSheetSubmission PRIMARY KEY CLUSTERED ([AnswerSheetSubmissionId]),
        CONSTRAINT FK_AnswerSheetSubmission_TestSchedule FOREIGN KEY ([TestScheduleId])
            REFERENCES [dbo].[TestSchedule] ([TestScheduleId])
    );

    CREATE INDEX IX_AnswerSheetSubmission_TestScheduleId ON [dbo].[AnswerSheetSubmission]([TestScheduleId]);
    CREATE INDEX IX_AnswerSheetSubmission_StudentId ON [dbo].[AnswerSheetSubmission]([StudentId]);
END
GO
