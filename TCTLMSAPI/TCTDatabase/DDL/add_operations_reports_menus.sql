-- Operations Reports: adds the "Reports" parent menu and one child menu per report so that
-- Super Admin -> Settings -> Role Permission can grant each report individually.
-- Data only (no schema change). Idempotent: rows are matched by Link and never duplicated;
-- re-running only re-syncs names/descriptions.
--
-- No RoleMenuPermission rows are inserted: every role starts with NO report access until the
-- Super Admin grants it on the Role Permission page (saving creates the permission row).
-- Child links must match TCTLMSWeb/src/pages/lms/operation/reports/reportConfig.js
-- and OperationsReportsRepository (link = /lms/operation/reports/<report key>).

DECLARE @SeedAdminUserId UNIQUEIDENTIFIER = '2A3971BA-B5B9-45E7-FCC3-08DCF1189F52';
DECLARE @ParentName NVARCHAR(200) = N'Reports';
DECLARE @ParentDescription NVARCHAR(200) = N'Operations Reports';

-- 1. Parent menu (no link; expands to the report entries, like Tutors / Payroll / Schedule).
DECLARE @ReportsParentId INT = (
    SELECT TOP 1 m.Id FROM Menu m
    WHERE m.ParentMenuId = 0 AND m.Name = @ParentName AND m.Description = @ParentDescription);

IF @ReportsParentId IS NULL
BEGIN
    INSERT INTO Menu (Name, Description, IsMenu, IsParentMenu, ParentMenuId, Icon, Link, NewTab, ItemDisable, SortOrder, IsActive, CreatedDate, CreatedBy)
    VALUES (@ParentName, @ParentDescription, 1, 1, 0, 'reports', '', 0, 0,
            ISNULL((SELECT MAX(SortOrder) FROM Menu WHERE ParentMenuId = 0), 0) + 1, 1, GETDATE(), @SeedAdminUserId);
    SET @ReportsParentId = SCOPE_IDENTITY();
    PRINT 'Reports parent menu inserted (Id ' + CAST(@ReportsParentId AS varchar) + ').';
END
ELSE
BEGIN
    PRINT 'Reports parent menu already exists (Id ' + CAST(@ReportsParentId AS varchar) + ').';
END;

-- 2. One child menu per report.
DECLARE @Targets TABLE (Name NVARCHAR(200), Link NVARCHAR(200), SortOrder INT);
INSERT INTO @Targets (Name, Link, SortOrder) VALUES
    (N'Attendance Report',             '/lms/operation/reports/attendance',  1),
    (N'Class Completion Report',       '/lms/operation/reports/completion',  2),
    (N'Tutor Performance Report',      '/lms/operation/reports/tutors',      3),
    (N'Enrollment Report',             '/lms/operation/reports/enrollment',  4),
    (N'Assignment & Exam Report',      '/lms/operation/reports/assessments', 5),
    (N'Student Progress Report',       '/lms/operation/reports/progress',    6),
    (N'Feedback & Support Report',     '/lms/operation/reports/feedback',    7),
    (N'PTM Report',                    '/lms/operation/reports/ptm',         8),
    (N'Alerts & Cancellations Report', '/lms/operation/reports/alerts',      9);

INSERT INTO Menu (Name, Description, IsMenu, IsParentMenu, ParentMenuId, Icon, Link, NewTab, ItemDisable, SortOrder, IsActive, CreatedDate, CreatedBy)
SELECT t.Name, t.Name, 1, 0, @ReportsParentId, '', t.Link, 0, 0, t.SortOrder, 1, GETDATE(), @SeedAdminUserId
FROM @Targets t
WHERE NOT EXISTS (SELECT 1 FROM Menu m WHERE m.Link = t.Link);

PRINT CAST(@@ROWCOUNT AS varchar) + ' report menu row(s) inserted.';

-- 3. Keep names/parent in sync on re-run (keyed by Link). Permissions are untouched.
UPDATE m
SET m.Name = t.Name, m.Description = t.Name, m.ParentMenuId = @ReportsParentId, m.ModifiedDate = GETDATE()
FROM Menu m
INNER JOIN @Targets t ON t.Link = m.Link;

-- Verify
SELECT Id, Name, Description, Link, ParentMenuId, SortOrder, IsActive
FROM Menu
WHERE Id = @ReportsParentId OR ParentMenuId = @ReportsParentId
ORDER BY ParentMenuId, SortOrder;
