-- Accounts Reports: adds the "Accounts Reports" parent menu and one child menu per report so that
-- Super Admin -> Settings -> Role Permission can grant each report individually.
-- Data only (no schema change). Idempotent: rows are matched by Link and never duplicated;
-- re-running only re-syncs names/descriptions.
--
-- No RoleMenuPermission rows are inserted: every role (including Accounts) starts with NO report
-- access until the Super Admin grants it on the Role Permission page (saving creates the row).
-- Child links must match TCTLMSWeb/src/pages/lms/accounts/reports/accountsReportConfig.js
-- and AccountsReportsRepository (link = /lms/accounts/reports/<report key>).

DECLARE @SeedAdminUserId UNIQUEIDENTIFIER = '2A3971BA-B5B9-45E7-FCC3-08DCF1189F52';
DECLARE @ParentName NVARCHAR(200) = N'Accounts Reports';
DECLARE @ParentDescription NVARCHAR(200) = N'Accounts Reports';

-- 1. Parent menu (no link; the sidebar points it at the Accounts Reports landing page).
DECLARE @ReportsParentId INT = (
    SELECT TOP 1 m.Id FROM Menu m
    WHERE m.ParentMenuId = 0 AND m.Name = @ParentName AND m.Description = @ParentDescription);

IF @ReportsParentId IS NULL
BEGIN
    INSERT INTO Menu (Name, Description, IsMenu, IsParentMenu, ParentMenuId, Icon, Link, NewTab, ItemDisable, SortOrder, IsActive, CreatedDate, CreatedBy)
    VALUES (@ParentName, @ParentDescription, 1, 1, 0, 'reports', '', 0, 0,
            ISNULL((SELECT MAX(SortOrder) FROM Menu WHERE ParentMenuId = 0), 0) + 1, 1, GETDATE(), @SeedAdminUserId);
    SET @ReportsParentId = SCOPE_IDENTITY();
    PRINT 'Accounts Reports parent menu inserted (Id ' + CAST(@ReportsParentId AS varchar) + ').';
END
ELSE
BEGIN
    PRINT 'Accounts Reports parent menu already exists (Id ' + CAST(@ReportsParentId AS varchar) + ').';
END;

-- 2. One child menu per report.
DECLARE @Targets TABLE (Name NVARCHAR(200), Link NVARCHAR(200), SortOrder INT);
INSERT INTO @Targets (Name, Link, SortOrder) VALUES
    (N'Accounts Overview',             '/lms/accounts/reports/overview',  1),
    (N'Invoice Reports',               '/lms/accounts/reports/invoices',  2),
    (N'Revenue Reports',               '/lms/accounts/reports/revenue',   3),
    (N'Payment Reports',               '/lms/accounts/reports/payments',  4),
    (N'Financial Reports',             '/lms/accounts/reports/financial', 5),
    (N'Refund & Dropout Reports',      '/lms/accounts/reports/refunds',   6);

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
