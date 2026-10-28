/*
    Adds block-state columns to StudentPaymentPlan (prepaid v2, Scenario 3 overrun).

    When a student burns the prepaid credit (completed-class value >= amount paid) before the
    scheduled plan ends, the plan is blocked: this subject's remaining classes become
    non-clickable in every role's calendar until a top-up (balance) invoice is paid.

    - IsBlocked            : true while remaining classes are blocked.
    - BlockedDate          : when the block was raised.
    - BalanceInvoiceNumber : the top-up invoice the parent must pay to unblock.

    Idempotent - safe to re-run.
*/
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.StudentPaymentPlan') AND name = 'IsBlocked')
    ALTER TABLE dbo.StudentPaymentPlan ADD IsBlocked BIT NOT NULL DEFAULT 0;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.StudentPaymentPlan') AND name = 'BlockedDate')
    ALTER TABLE dbo.StudentPaymentPlan ADD BlockedDate DATETIME2 NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.StudentPaymentPlan') AND name = 'BalanceInvoiceNumber')
    ALTER TABLE dbo.StudentPaymentPlan ADD BalanceInvoiceNumber NVARCHAR(50) NULL;
GO
