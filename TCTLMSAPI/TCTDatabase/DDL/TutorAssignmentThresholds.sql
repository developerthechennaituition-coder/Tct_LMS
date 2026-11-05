-- Tutor assignment rules (TutorAssignmentThresholdRules in the API):
--   1-3. a Coordinator may assign the same tutor once per cooldown: 7 days below the low-load student limit,
--        14 days up to the high-load limit, 30 days above it (above it a repeat goes to the Super Admin instead);
--   4.   a tutor assigned by another Coordinator for a still-pending demo is held for TutorDemoHoldHours
--        for the same board, grade and subject;
--   5.   a student grade outside the tutor's eligible grades needs Super Admin approval.
-- Additive only and re-runnable:
--   1. adds the nullable column dbo.TutorPaymentApproval.AssignmentRuleCodes (null on every existing row);
--   2. adds a filtered unique index so one requester has at most one pending rule request per course and tutor
--      (rows without AssignmentRuleCodes, i.e. every existing payment request, are not covered by it);
--   3. adds the six Threshold Configuration rows, only where a row with that ThresholdName does not exist yet.
-- No existing table, row, threshold value or index is changed. Run on the LMS database after taking a backup,
-- BEFORE deploying the API build that maps AssignmentRuleCodes: until the column exists that build cannot read
-- dbo.TutorPaymentApproval, and until the rows exist Coordinator tutor assignments are refused (fail safe).

-- The filtered unique index needs these settings; they apply from the next batch (sqlcmd defaults
-- QUOTED_IDENTIFIER to OFF).
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- 1. Column -----------------------------------------------------------------------------------------------
IF COL_LENGTH('dbo.TutorPaymentApproval', 'AssignmentRuleCodes') IS NULL
    ALTER TABLE [dbo].[TutorPaymentApproval] ADD [AssignmentRuleCodes] NVARCHAR(100) NULL;
GO

-- 2. One pending rule request per course, tutor and requester ------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'UX_TutorPaymentApproval_PendingAssignmentRule'
                 AND object_id = OBJECT_ID('dbo.TutorPaymentApproval'))
    CREATE UNIQUE NONCLUSTERED INDEX [UX_TutorPaymentApproval_PendingAssignmentRule]
        ON [dbo].[TutorPaymentApproval] ([SalesDetailsId], [TutorId], [RequestedBy])
        WHERE [IsActive] = 1 AND [ApprovalStatus] = 1012003 /* Pending */ AND [AssignmentRuleCodes] IS NOT NULL;
GO

-- 3. Threshold Configuration rows --------------------------------------------------------------------------
SET XACT_ABORT ON;
BEGIN TRANSACTION;

INSERT INTO dbo.Thresholds (Id, EntityType, GroupKey, ThresholdName, Value, Unit, Description, IsActive, CreatedDate, CreatedBy)
SELECT NEWID(), 'Tutor', 'TutorAssignment', v.ThresholdName, v.Value, v.Unit, v.Description, 1, GETDATE(),
       '00000000-0000-0000-0000-000000000000'
FROM (VALUES
    ('TutorAssignLowLoadStudentLimit',  5,  'count', 'Tutor with fewer active students than this: 7-day assign cooldown'),
    ('TutorAssignHighLoadStudentLimit', 10, 'count', 'Tutor with more active students than this: 30-day cooldown, repeat needs Super Admin'),
    ('TutorAssignCooldownDaysLow',      7,  'days',  'Days before a coordinator can assign a low-load tutor again'),
    ('TutorAssignCooldownDaysMid',      14, 'days',  'Days before a coordinator can assign a tutor with 5-10 students again'),
    ('TutorAssignCooldownDaysHigh',     30, 'days',  'Days within which a repeat assignment of a high-load tutor needs Super Admin'),
    ('TutorDemoHoldHours',              24, 'hours', 'Hours a tutor is held for the coordinator of a pending demo')
) AS v (ThresholdName, Value, Unit, Description)
WHERE NOT EXISTS (SELECT 1 FROM dbo.Thresholds t WHERE t.ThresholdName = v.ThresholdName);

COMMIT TRANSACTION;
GO
