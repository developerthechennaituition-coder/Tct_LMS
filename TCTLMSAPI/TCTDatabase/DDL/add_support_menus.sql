-- Support: adds the "Support" parent menu with its "Help" and "PTM" child menus so that
-- Super Admin -> Settings -> Role Permission can grant Support to any role (ticking View on
-- Support also ticks Help and PTM, as for every parent menu).
-- Data only (no schema change). Idempotent: rows are matched by Name/Link and never duplicated.
--
-- Until now the sidebar added Support for the Operations role in code. To keep Operations'
-- current access, Operations gets View on the three menus ONLY where it has no permission row yet
-- (a later revoke by the Super Admin is never overwritten). No other role is granted anything.
-- Child links must match TCTLMSWeb/src/route/Index.js (/lms/operation/help, /lms/operation/ptm).

SET XACT_ABORT ON;
BEGIN TRANSACTION;

DECLARE @SeedAdminUserId UNIQUEIDENTIFIER = '2A3971BA-B5B9-45E7-FCC3-08DCF1189F52';
DECLARE @ParentName NVARCHAR(200) = N'Support';
DECLARE @ParentDescription NVARCHAR(200) = N'Support (Help, PTM)';

-- 1. Parent menu (no link; expands to Help and PTM).
DECLARE @SupportParentId INT = (
    SELECT TOP 1 m.Id FROM Menu m
    WHERE m.ParentMenuId = 0 AND m.Name = @ParentName AND m.Description = @ParentDescription);

IF @SupportParentId IS NULL
BEGIN
    INSERT INTO Menu (Name, Description, IsMenu, IsParentMenu, ParentMenuId, Icon, Link, NewTab, ItemDisable, SortOrder, IsActive, CreatedDate, CreatedBy)
    VALUES (@ParentName, @ParentDescription, 1, 1, 0, 'help-fill', '', 0, 0,
            ISNULL((SELECT MAX(SortOrder) FROM Menu WHERE ParentMenuId = 0), 0) + 1, 1, GETDATE(), @SeedAdminUserId);
    SET @SupportParentId = SCOPE_IDENTITY();
    PRINT 'Support parent menu inserted (Id ' + CAST(@SupportParentId AS varchar) + ').';
END
ELSE
    PRINT 'Support parent menu already exists (Id ' + CAST(@SupportParentId AS varchar) + ').';

-- 2. Child menus.
DECLARE @Targets TABLE (Name NVARCHAR(200), Link NVARCHAR(200), SortOrder INT);
INSERT INTO @Targets (Name, Link, SortOrder) VALUES
    (N'Help', '/lms/operation/help', 1),
    (N'PTM',  '/lms/operation/ptm',  2);

INSERT INTO Menu (Name, Description, IsMenu, IsParentMenu, ParentMenuId, Icon, Link, NewTab, ItemDisable, SortOrder, IsActive, CreatedDate, CreatedBy)
SELECT t.Name, t.Name, 1, 0, @SupportParentId, '', t.Link, 0, 0, t.SortOrder, 1, GETDATE(), @SeedAdminUserId
FROM @Targets t
WHERE NOT EXISTS (SELECT 1 FROM Menu m WHERE m.Link = t.Link);
PRINT CAST(@@ROWCOUNT AS varchar) + ' support child menu row(s) inserted.';

-- Keep names/parent in sync on re-run (keyed by Link). Permissions are untouched here.
UPDATE m
SET m.Name = t.Name, m.Description = t.Name, m.ParentMenuId = @SupportParentId, m.ModifiedDate = GETDATE()
FROM Menu m
INNER JOIN @Targets t ON t.Link = m.Link;

-- 3. Keep Operations' existing Support access (View only), where it has no row yet.
DECLARE @OperationsRoleId INT = (SELECT TOP 1 Id FROM Roles WHERE RoleName = 'Operations');
IF @OperationsRoleId IS NOT NULL
BEGIN
    INSERT INTO RoleMenuPermission (RoleId, MenuId, [View], [Add], [Edit], [Delete], IsActive, CreatedDate, CreatedBy)
    SELECT @OperationsRoleId, m.Id, 1, 0, 0, 0, 1, GETDATE(), @SeedAdminUserId
    FROM Menu m
    WHERE (m.Id = @SupportParentId OR m.ParentMenuId = @SupportParentId)
      AND NOT EXISTS (SELECT 1 FROM RoleMenuPermission p WHERE p.RoleId = @OperationsRoleId AND p.MenuId = m.Id);
    PRINT CAST(@@ROWCOUNT AS varchar) + ' Operations permission row(s) inserted.';
END

COMMIT TRANSACTION;

-- Verify
SELECT m.Id, m.Name, m.Link, m.ParentMenuId, m.SortOrder, m.IsActive
FROM Menu m
WHERE m.Id = @SupportParentId OR m.ParentMenuId = @SupportParentId
ORDER BY m.ParentMenuId, m.SortOrder;
