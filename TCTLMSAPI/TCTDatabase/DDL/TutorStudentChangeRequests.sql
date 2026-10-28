-- Tutor Change / Student Change requests (Student → Tutor Change, Tutor → Student Change,
-- Operations → Request from Students / Request from Tutors).
-- Additive only and re-runnable:
--   1. creates dbo.AssignmentChangeRequest if it does not exist;
--   2. adds the four menus (matched by Link, never duplicated);
--   3. grants View on them to the roles named in the requirement, only where the role has no
--      permission row for that menu yet (a later revoke by the Super Admin is never overwritten).
-- No existing table, row or permission is changed. Run on the LMS database after taking a backup,
-- before deploying the API build that maps AssignmentChangeRequest.

-- The filtered unique index needs these settings; they apply from the next batch (sqlcmd defaults
-- QUOTED_IDENTIFIER to OFF).
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

SET XACT_ABORT ON;
BEGIN TRY
BEGIN TRANSACTION;

-- 1. Request table --------------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id
               WHERE t.name = 'AssignmentChangeRequest' AND s.name = 'dbo')
BEGIN
    CREATE TABLE [dbo].[AssignmentChangeRequest] (
        [Id]                 UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWSEQUENTIALID(),
        [RequestNo]          INT               IDENTITY(1,1) NOT NULL,   -- readable request number
        [RequestType]        NVARCHAR(20)      NOT NULL,                 -- TutorChange (by student) / StudentChange (by tutor)
        [SalesDetailsId]     UNIQUEIDENTIFIER  NOT NULL,                 -- the course (student + subject)
        [StudentId]          UNIQUEIDENTIFIER  NOT NULL,                 -- dbo.Student.Id
        [CurrentTutorId]     UNIQUEIDENTIFIER  NOT NULL,                 -- dbo.Tutor.Id at submission
        [Reason]             NVARCHAR(100)     NOT NULL,
        [Description]        NVARCHAR(2000)    NOT NULL,
        [Status]             NVARCHAR(20)      NOT NULL DEFAULT 'Pending', -- Pending / Reassigned / Rejected
        [NewTutorId]         UNIQUEIDENTIFIER  NULL,                     -- dbo.Tutor.Id chosen by Operations
        [DecidedBy]          UNIQUEIDENTIFIER  NULL,                     -- dbo.[User].Id (Operations)
        [DecidedDate]        DATETIME2         NULL,
        [DecisionNote]       NVARCHAR(1000)    NULL,                     -- approval note / rejection reason
        [MovedSessionCount]  INT               NULL,                     -- future classes moved to the new tutor

        [CreatedBy]          UNIQUEIDENTIFIER  NOT NULL,                 -- dbo.[User].Id of the requester (from the JWT)
        [CreatedDate]        DATETIME2         NOT NULL DEFAULT GETUTCDATE(),
        [ModifiedBy]         UNIQUEIDENTIFIER  NULL,
        [ModifiedDate]       DATETIME2         NULL,
        [IsActive]           BIT               NOT NULL DEFAULT 1,

        CONSTRAINT PK_AssignmentChangeRequest PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT UQ_AssignmentChangeRequest_RequestNo UNIQUE ([RequestNo]),
        CONSTRAINT FK_AssignmentChangeRequest_SalesDetails FOREIGN KEY ([SalesDetailsId]) REFERENCES [dbo].[SalesDetails]([Id]),
        CONSTRAINT FK_AssignmentChangeRequest_Student FOREIGN KEY ([StudentId]) REFERENCES [dbo].[Student]([Id]),
        CONSTRAINT FK_AssignmentChangeRequest_CurrentTutor FOREIGN KEY ([CurrentTutorId]) REFERENCES [dbo].[Tutor]([Id]),
        CONSTRAINT FK_AssignmentChangeRequest_NewTutor FOREIGN KEY ([NewTutorId]) REFERENCES [dbo].[Tutor]([Id]),
        CONSTRAINT FK_AssignmentChangeRequest_CreatedBy FOREIGN KEY ([CreatedBy]) REFERENCES [dbo].[User]([Id]),
        CONSTRAINT FK_AssignmentChangeRequest_DecidedBy FOREIGN KEY ([DecidedBy]) REFERENCES [dbo].[User]([Id]),
        CONSTRAINT CK_AssignmentChangeRequest_Type CHECK ([RequestType] IN ('TutorChange', 'StudentChange')),
        CONSTRAINT CK_AssignmentChangeRequest_Status CHECK ([Status] IN ('Pending', 'Reassigned', 'Rejected'))
    );

    -- At most one open request per course and request type (also stops double submission races).
    CREATE UNIQUE INDEX UX_AssignmentChangeRequest_OnePending
        ON [dbo].[AssignmentChangeRequest]([SalesDetailsId], [RequestType])
        WHERE [Status] = 'Pending' AND [IsActive] = 1;
    CREATE INDEX IX_AssignmentChangeRequest_Type_Status
        ON [dbo].[AssignmentChangeRequest]([RequestType], [Status]) INCLUDE ([SalesDetailsId], [CreatedDate]);
    CREATE INDEX IX_AssignmentChangeRequest_CreatedBy ON [dbo].[AssignmentChangeRequest]([CreatedBy]);
    PRINT 'dbo.AssignmentChangeRequest created.';
END
ELSE
    PRINT 'dbo.AssignmentChangeRequest already exists.';

-- 2. Menus ------------------------------------------------------------------------------------------
DECLARE @SeedAdminUserId UNIQUEIDENTIFIER = '2A3971BA-B5B9-45E7-FCC3-08DCF1189F52';
DECLARE @Menus TABLE (Name NVARCHAR(200), Link NVARCHAR(200), Icon NVARCHAR(50));
INSERT INTO @Menus (Name, Link, Icon) VALUES
    (N'Request from Students', '/lms/operation/change-requests/students', 'swap'),
    (N'Request from Tutors',   '/lms/operation/change-requests/tutors',   'swap'),
    (N'Tutor Change',          '/lms/change-request/tutor-change',        'swap'),
    (N'Student Change',        '/lms/change-request/student-change',      'swap');

INSERT INTO Menu (Name, Description, IsMenu, IsParentMenu, ParentMenuId, Icon, Link, NewTab, ItemDisable, SortOrder, IsActive, CreatedDate, CreatedBy)
SELECT m.Name, m.Name, 1, 0, 0, m.Icon, m.Link, 0, 0,
       ISNULL((SELECT MAX(SortOrder) FROM Menu WHERE ParentMenuId = 0), 0) + ROW_NUMBER() OVER (ORDER BY m.Link),
       1, GETDATE(), @SeedAdminUserId
FROM @Menus m
WHERE NOT EXISTS (SELECT 1 FROM Menu x WHERE x.Link = m.Link);
PRINT CAST(@@ROWCOUNT AS varchar) + ' change-request menu row(s) inserted.';

-- 3. Default View permissions (only where no row exists for that role and menu) ----------------------
DECLARE @Grants TABLE (RoleName NVARCHAR(100), Link NVARCHAR(200));
INSERT INTO @Grants (RoleName, Link) VALUES
    ('Operations',      '/lms/operation/change-requests/students'),
    ('Operations',      '/lms/operation/change-requests/tutors'),
    ('OperationsAdmin', '/lms/operation/change-requests/students'),
    ('OperationsAdmin', '/lms/operation/change-requests/tutors'),
    ('Student',         '/lms/change-request/tutor-change'),
    ('Tutor',           '/lms/change-request/student-change');

INSERT INTO RoleMenuPermission (RoleId, MenuId, [View], [Add], [Edit], [Delete], IsActive, CreatedDate, CreatedBy)
SELECT r.Id, m.Id, 1, 0, 0, 0, 1, GETDATE(), @SeedAdminUserId
FROM @Grants g
JOIN Roles r ON r.RoleName = g.RoleName
JOIN Menu m ON m.Link = g.Link
WHERE NOT EXISTS (SELECT 1 FROM RoleMenuPermission p WHERE p.RoleId = r.Id AND p.MenuId = m.Id);
PRINT CAST(@@ROWCOUNT AS varchar) + ' permission row(s) inserted.';

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO

-- Verify
SELECT m.Id, m.Name, m.Link, r.RoleName, p.[View]
FROM Menu m
LEFT JOIN RoleMenuPermission p ON p.MenuId = m.Id AND p.IsActive = 1
LEFT JOIN Roles r ON r.Id = p.RoleId
WHERE m.Link LIKE '/lms/operation/change-requests/%' OR m.Link LIKE '/lms/change-request/%'
ORDER BY m.Link, r.RoleName;
