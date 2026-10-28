/*
    Feature: prepaid / installment enrollments (Scenario 1) + unified invoice summary.

    Two new tables:
      * StudentPaymentPlan - one row per prepaid subject enrollment (SalesDetails).
                             Holds the commitment: duration, total classes, total fee.
      * StudentPayment     - each receipt against a plan (single shot = 1 row,
                             installments = 2/3/4 rows).

    A SalesDetails with NO active StudentPaymentPlan row = Scenario 2 (pay monthly).
    That absence is the scenario switch - no flag to set.

    ── Open design decisions (adjust BEFORE running if these differ) ────────────
    1. GRANULARITY: modelled per SUBJECT (SalesDetailsId), because each subject has
       its own rate, tutor, and class count, and a student can enroll in Maths for
       6 months + Physics for 3. If instead you want ONE plan covering ALL of a
       student's subjects with a single combined fee, tell me - it changes the
       Plan grain to StudentId and moves fees to the payment rows.
    2. TotalClasses is stored as a SNAPSHOT of what was promised. Actual scheduled/
       completed counts are still derived live from ScheduleDetails, so a mid-plan
       reschedule doesn't corrupt the "remaining classes" figure. Leave NULL to have
       the invoice derive the total from the plan's date window instead.
    3. Money precision DECIMAL(18,2) matches EF's default for the existing decimal
       columns (SalesDetails.ParentPayment etc.).

    Run STEP 1, then STEP 2. Both are idempotent (safe to re-run).
*/

--------------------------------------------------------------------------------
-- STEP 1 - StudentPaymentPlan
--------------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.tables t
    JOIN sys.schemas s ON t.schema_id = s.schema_id
    WHERE t.name = 'StudentPaymentPlan' AND s.name = 'dbo'
)
BEGIN
    CREATE TABLE [dbo].[StudentPaymentPlan] (
        [Id]              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),

        -- The enrollment this plan covers (one subject).
        [SalesDetailsId]  UNIQUEIDENTIFIER NOT NULL,
        [StudentId]       UNIQUEIDENTIFIER NOT NULL,   -- denormalized for lookups

        -- The commitment.
        [PlanMonths]      INT              NOT NULL,   -- 3 / 6 / 12
        [StartMonth]      INT              NOT NULL,   -- 1-12, first billed month
        [StartYear]       INT              NOT NULL,
        [TotalClasses]    INT              NULL,        -- snapshot; NULL = derive from schedule
        [TotalFee]        DECIMAL(18,2)    NOT NULL,
        [InstallmentCount] INT             NOT NULL DEFAULT 1,  -- 1 = single shot; 2/3/4 = installments

        -- BaseEntity (matches every other table).
        [CreatedBy]       UNIQUEIDENTIFIER NOT NULL,
        [CreatedDate]     DATETIME2        NOT NULL DEFAULT GETDATE(),
        [ModifiedBy]      UNIQUEIDENTIFIER NULL,
        [ModifiedDate]    DATETIME2        NULL,
        [IsActive]        BIT              NOT NULL DEFAULT 1,

        CONSTRAINT [PK_StudentPaymentPlan] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [FK_StudentPaymentPlan_SalesDetails]
            FOREIGN KEY ([SalesDetailsId]) REFERENCES [dbo].[SalesDetails]([Id])
    );

    -- One active plan per enrollment. Filtered so a soft-deleted plan can be replaced.
    CREATE UNIQUE INDEX [UX_StudentPaymentPlan_ActiveSalesDetails]
        ON [dbo].[StudentPaymentPlan]([SalesDetailsId])
        WHERE [IsActive] = 1;

    CREATE INDEX [IX_StudentPaymentPlan_Student]
        ON [dbo].[StudentPaymentPlan]([StudentId]) INCLUDE ([IsActive]);
END
GO

--------------------------------------------------------------------------------
-- STEP 2 - StudentPayment
--------------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.tables t
    JOIN sys.schemas s ON t.schema_id = s.schema_id
    WHERE t.name = 'StudentPayment' AND s.name = 'dbo'
)
BEGIN
    CREATE TABLE [dbo].[StudentPayment] (
        [Id]                    UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),

        [StudentPaymentPlanId]  UNIQUEIDENTIFIER NOT NULL,
        [InstallmentNo]         INT              NULL,   -- 1..InstallmentCount; NULL for ad-hoc
        [Amount]                DECIMAL(18,2)    NOT NULL,
        [PaidDate]              DATETIME2        NOT NULL,
        [PaymentMode]           NVARCHAR(50)     NULL,   -- Cash / UPI / Bank / Stripe
        [ReferenceNo]           NVARCHAR(100)    NULL,   -- txn ref / cheque no
        [Notes]                 NVARCHAR(500)    NULL,

        -- BaseEntity.
        [CreatedBy]             UNIQUEIDENTIFIER NOT NULL,
        [CreatedDate]           DATETIME2        NOT NULL DEFAULT GETDATE(),
        [ModifiedBy]            UNIQUEIDENTIFIER NULL,
        [ModifiedDate]          DATETIME2        NULL,
        [IsActive]              BIT              NOT NULL DEFAULT 1,

        CONSTRAINT [PK_StudentPayment] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [FK_StudentPayment_Plan]
            FOREIGN KEY ([StudentPaymentPlanId]) REFERENCES [dbo].[StudentPaymentPlan]([Id])
    );

    CREATE INDEX [IX_StudentPayment_Plan]
        ON [dbo].[StudentPayment]([StudentPaymentPlanId]) INCLUDE ([Amount], [IsActive]);
END
GO
