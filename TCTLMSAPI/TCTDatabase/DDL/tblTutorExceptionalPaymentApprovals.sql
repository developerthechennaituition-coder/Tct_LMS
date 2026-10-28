--IF NOT EXISTS (
--    SELECT 1
--    FROM sys.tables t
--    JOIN sys.schemas s ON t.schema_id = s.schema_id
--    WHERE t.name = 'TutorPaymentApproval'
--      AND s.name = 'dbo'
--)
--BEGIN

--CREATE TABLE [dbo].[TutorPaymentApproval] (
--    [Id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    
--    -- Reference to existing allocation
--    [TutorStudentAllocationId] UNIQUEIDENTIFIER NOT NULL,

--    -- Snapshot data (important for audit)
--    [StudentId] UNIQUEIDENTIFIER NOT NULL,
--    [TutorId] UNIQUEIDENTIFIER NOT NULL,
--    [SalesDetailsId] UNIQUEIDENTIFIER NULL,

--    -- Context for validation
--    [SubjectId] UNIQUEIDENTIFIER NOT NULL,
--    [Grade] NVARCHAR(50) NOT NULL,
--    [Board] NVARCHAR(50) NOT NULL,

--    -- Payment comparison values
--    [RequestedPaymentAmount] DECIMAL(10,2) NOT NULL,
--    [BasePaymentAmount] DECIMAL(10,2) NOT NULL,
--    [TutorCurrentMaxPayment] DECIMAL(10,2) NOT NULL,

--    -- Approval status
--    [ApprovalStatus] INT NOT NULL, 
--    -- 1 = Pending
--    -- 2 = Approved
--    -- 3 = Rejected

--    -- Approval metadata
--    [RequestedBy] UNIQUEIDENTIFIER NOT NULL,
--    [RequestedDate] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

--    [ApprovedBy] UNIQUEIDENTIFIER NULL,
--    [ApprovedDate] DATETIME2 NULL,
--    [ApprovalRemarks] NVARCHAR(MAX) NULL,

--    -- Soft delete / lifecycle
--    [IsActive] BIT NOT NULL DEFAULT 1,

--    CONSTRAINT PK_TutorExceptionalPaymentApprovals PRIMARY KEY CLUSTERED ([Id]), 
--);
--END
--GO