SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.TutorPaymentApproval', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TutorPaymentApproval
    (
        Id uniqueidentifier NOT NULL CONSTRAINT PK_TutorPaymentApproval PRIMARY KEY,
        TutorStudentAllocationId uniqueidentifier NOT NULL,
        StudentId uniqueidentifier NOT NULL,
        TutorId uniqueidentifier NOT NULL,
        SalesDetailsId uniqueidentifier NULL,
        SubjectId uniqueidentifier NOT NULL,
        Grade nvarchar(200) NOT NULL,
        Board nvarchar(200) NOT NULL,
        RequestedPaymentAmount decimal(18,2) NOT NULL,
        BasePaymentAmount decimal(18,2) NOT NULL,
        TutorCurrentMaxPayment decimal(18,2) NOT NULL,
        ApprovalStatus int NOT NULL,
        RequestedBy uniqueidentifier NOT NULL,
        RequestedDate datetime2 NOT NULL,
        ApprovedBy uniqueidentifier NULL,
        ApprovedDate datetime2 NULL,
        ApprovalRemarks nvarchar(max) NULL,
        RequestType int NOT NULL CONSTRAINT DF_TutorPaymentApproval_RequestType DEFAULT (2),
        ApprovedPaymentAmount decimal(18,2) NULL,
        EffectiveDate datetime2 NULL,
        PreviousTutorId uniqueidentifier NULL,
        PreviousStatusId uniqueidentifier NULL,
        RequestReason nvarchar(max) NULL,
        IsActive bit NOT NULL CONSTRAINT DF_TutorPaymentApproval_IsActive DEFAULT (1)
    );
END;

IF COL_LENGTH('dbo.TutorPaymentApproval', 'RequestType') IS NULL
    ALTER TABLE dbo.TutorPaymentApproval ADD RequestType int NOT NULL CONSTRAINT DF_TutorPaymentApproval_RequestType DEFAULT (2);
IF COL_LENGTH('dbo.TutorPaymentApproval', 'ApprovedPaymentAmount') IS NULL
    ALTER TABLE dbo.TutorPaymentApproval ADD ApprovedPaymentAmount decimal(18,2) NULL;
IF COL_LENGTH('dbo.TutorPaymentApproval', 'EffectiveDate') IS NULL
    ALTER TABLE dbo.TutorPaymentApproval ADD EffectiveDate datetime2 NULL;
IF COL_LENGTH('dbo.TutorPaymentApproval', 'PreviousTutorId') IS NULL
    ALTER TABLE dbo.TutorPaymentApproval ADD PreviousTutorId uniqueidentifier NULL;
IF COL_LENGTH('dbo.TutorPaymentApproval', 'PreviousStatusId') IS NULL
    ALTER TABLE dbo.TutorPaymentApproval ADD PreviousStatusId uniqueidentifier NULL;
IF COL_LENGTH('dbo.TutorPaymentApproval', 'RequestReason') IS NULL
    ALTER TABLE dbo.TutorPaymentApproval ADD RequestReason nvarchar(max) NULL;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_TutorPaymentApproval_Pending'
      AND object_id = OBJECT_ID('dbo.TutorPaymentApproval')
)
    CREATE INDEX IX_TutorPaymentApproval_Pending
        ON dbo.TutorPaymentApproval (TutorId, ApprovalStatus, IsActive)
        INCLUDE (SalesDetailsId, RequestType, RequestedDate);

COMMIT TRANSACTION;
