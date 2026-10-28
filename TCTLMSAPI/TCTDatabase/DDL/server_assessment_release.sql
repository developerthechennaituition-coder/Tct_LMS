-- Assessment release. Run in the intended LMS database after taking a backup.
-- No attendance, invoice, payroll, chat, or existing assessment data is deleted.
-- Re-runnable. If duplicate active tests/submissions exist, stop and review them manually.
SET XACT_ABORT ON;
BEGIN TRY
BEGIN TRANSACTION;
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

IF EXISTS (SELECT 1 FROM dbo.AnswerSheetSubmission WHERE IsActive = 1
    GROUP BY TestScheduleId, StudentId HAVING COUNT(*) > 1)
BEGIN
    ;THROW 51000, 'Duplicate active answer-sheet submissions exist. Review duplicates before deployment; nothing has been deleted.', 1;
END;
IF EXISTS (SELECT 1 FROM dbo.TestSchedule WHERE IsActive = 1 AND
    (ExamStartTime IS NULL OR LEN(ExamStartTime) <> 5 OR SUBSTRING(ExamStartTime, 3, 1) <> ':'
     OR TRY_CONVERT(time(0), ExamStartTime) IS NULL))
BEGIN
    ;THROW 51002, 'Active tests have missing or invalid start times. Review and correct them to HH:mm (IST) before deployment.', 1;
END;
IF EXISTS (SELECT 1 FROM dbo.TestSchedule WHERE IsActive = 1
    GROUP BY StudentId, TutorId, SubjectId, ExamDate, ExamStartTime HAVING COUNT(*) > 1)
BEGIN
    ;THROW 51001, 'Duplicate active test schedules exist. Review duplicates before deployment; nothing has been deleted.', 1;
END;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.AnswerSheetSubmission') AND name = 'UX_Assessment_ActiveSubmission')
    CREATE UNIQUE INDEX UX_Assessment_ActiveSubmission ON dbo.AnswerSheetSubmission(TestScheduleId, StudentId) WHERE IsActive = 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.TestSchedule') AND name = 'UX_Assessment_ActiveTest')
    CREATE UNIQUE INDEX UX_Assessment_ActiveTest ON dbo.TestSchedule(StudentId, TutorId, SubjectId, ExamDate, ExamStartTime) WHERE IsActive = 1;
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('dbo.AnswerSheetSubmission') AND name = 'CK_Assessment_Marks')
    ALTER TABLE dbo.AnswerSheetSubmission WITH CHECK ADD CONSTRAINT CK_Assessment_Marks CHECK (
        (MarksObtained IS NULL AND MaxMarks IS NULL)
        OR (MarksObtained IS NOT NULL AND MaxMarks IS NOT NULL AND MaxMarks > 0 AND MarksObtained >= 0 AND MarksObtained <= MaxMarks));
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('dbo.TestSchedule') AND name = 'CK_Assessment_Duration')
    ALTER TABLE dbo.TestSchedule WITH CHECK ADD CONSTRAINT CK_Assessment_Duration CHECK (ExamDurationMinutes BETWEEN 1 AND 480);
COMMIT TRANSACTION;
SELECT DB_NAME() AS DatabaseName, 'Assessment schema ready' AS Result;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
