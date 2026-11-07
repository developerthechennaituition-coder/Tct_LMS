-- Tasks: adds the "Tasks" menu (/lms/tasks, the sidebar Tasks page) so that Super Admin ->
-- Settings -> Role Permission can grant or revoke Tasks for each role.
-- Data only (no schema change). Idempotent: the menu is matched by Link and never duplicated.
--
-- Run BEFORE deploying the build that reads this permission: from then on the Tasks menu, the
-- /lms/tasks page and the task APIs (api/my-calendar/tasks...) need View (or Add/Edit/Delete) on it.
--
-- Until now the sidebar showed Tasks to every role except Tutor and Student. To keep that access,
-- those roles get View ONLY where they have no permission row for this menu yet (a later revoke by
-- the Super Admin is never overwritten). Tutor and Student get nothing. No other menu is touched.
-- The link must match TCTLMSWeb/src/route/Index.js (/lms/tasks).

SET XACT_ABORT ON;
BEGIN TRANSACTION;

DECLARE @SeedAdminUserId UNIQUEIDENTIFIER = '2A3971BA-B5B9-45E7-FCC3-08DCF1189F52';
DECLARE @TasksLink NVARCHAR(200) = '/lms/tasks';

-- 1. Menu (top level, no children; the sidebar shows it right after My Calendar).
DECLARE @TasksMenuId INT = (SELECT TOP 1 m.Id FROM Menu m WHERE m.Link = @TasksLink);

IF @TasksMenuId IS NULL
BEGIN
    INSERT INTO Menu (Name, Description, IsMenu, IsParentMenu, ParentMenuId, Icon, Link, NewTab, ItemDisable, SortOrder, IsActive, CreatedDate, CreatedBy)
    VALUES (N'Tasks', N'Tasks (assign, complete and verify tasks)', 1, 0, 0, 'task', @TasksLink, 0, 0,
            ISNULL((SELECT MAX(SortOrder) FROM Menu WHERE ParentMenuId = 0), 0) + 1, 1, GETDATE(), @SeedAdminUserId);
    SET @TasksMenuId = SCOPE_IDENTITY();
    PRINT 'Tasks menu inserted (Id ' + CAST(@TasksMenuId AS varchar) + ').';
END
ELSE
    PRINT 'Tasks menu already exists (Id ' + CAST(@TasksMenuId AS varchar) + ').';

-- 2. Keep current access: View for every active role except Tutor and Student, where it has no row yet.
INSERT INTO RoleMenuPermission (RoleId, MenuId, [View], [Add], [Edit], [Delete], IsActive, CreatedDate, CreatedBy)
SELECT r.Id, @TasksMenuId, 1, 0, 0, 0, 1, GETDATE(), @SeedAdminUserId
FROM Roles r
WHERE r.IsActive = 1
  AND r.RoleName NOT IN ('Tutor', 'Student')
  AND NOT EXISTS (SELECT 1 FROM RoleMenuPermission p WHERE p.RoleId = r.Id AND p.MenuId = @TasksMenuId);
PRINT CAST(@@ROWCOUNT AS varchar) + ' Tasks permission row(s) inserted.';

COMMIT TRANSACTION;

-- Verify
SELECT m.Id, m.Name, m.Link, m.SortOrder, m.IsActive FROM Menu m WHERE m.Id = @TasksMenuId;
SELECT r.RoleName, p.[View], p.[Add], p.[Edit], p.[Delete]
FROM RoleMenuPermission p JOIN Roles r ON r.Id = p.RoleId
WHERE p.MenuId = @TasksMenuId
ORDER BY r.Id;
