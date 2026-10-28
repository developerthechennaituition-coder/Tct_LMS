IF NOT EXISTS (
    SELECT 1 FROM sys.tables t
    JOIN sys.schemas s ON t.schema_id = s.schema_id
    WHERE t.name = 'TestSchedule' AND s.name = 'dbo'
)
BEGIN
    CREATE TABLE [dbo].[TestSchedule] (
        [TestScheduleId]            UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
        [StudentId]                 UNIQUEIDENTIFIER    NOT NULL,
        [TutorId]                   UNIQUEIDENTIFIER    NOT NULL,
        [SubjectId]                 UNIQUEIDENTIFIER    NOT NULL,
        [BoardId]                   UNIQUEIDENTIFIER    NOT NULL,
        [GradeId]                   UNIQUEIDENTIFIER    NOT NULL,
        [ExamDate]                  DATETIME2           NOT NULL,
        [ExamStartTime]             NVARCHAR(10)        NULL,
        [ExamDurationMinutes]       INT                 NOT NULL DEFAULT 180,

        -- The question paper file itself is stored via the shared Document/DocumentStorage tables
        -- (Document.ReferenceId = TestScheduleId); these columns just track the upload event.
        [QuestionPaperNotes]        NVARCHAR(MAX)       NULL,
        [QuestionPaperUploadedBy]   UNIQUEIDENTIFIER    NULL,
        [QuestionPaperUploadedOn]   DATETIME2           NULL,

        [CreatedBy]                 UNIQUEIDENTIFIER    NOT NULL,
        [CreatedDate]                DATETIME2           NOT NULL DEFAULT GETUTCDATE(),
        [ModifiedBy]                UNIQUEIDENTIFIER    NULL,
        [ModifiedDate]              DATETIME2           NULL,
        [IsActive]                  BIT                 NOT NULL DEFAULT 1,

        CONSTRAINT PK_TestSchedule PRIMARY KEY CLUSTERED ([TestScheduleId])
    );

    CREATE INDEX IX_TestSchedule_StudentId ON [dbo].[TestSchedule]([StudentId]);
    CREATE INDEX IX_TestSchedule_TutorId ON [dbo].[TestSchedule]([TutorId]);
END
GO
