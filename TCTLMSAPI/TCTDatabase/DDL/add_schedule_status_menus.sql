-- Single, idempotent, environment-agnostic script for the entire config-driven Schedule
-- status-menu feature (mirrors TCTLMSWeb/src/pages/lms/schedule/scheduleStatusPages.config.js).
-- Safe to run on a fresh environment (production) or re-run on an already-migrated one (dev) --
-- every step is guarded and reconciles current state to the target state without duplicating or
-- erroring. Replaces all of: add_class_scheduled_menu.sql, add_demo_completed_menu.sql,
-- add_class_cancelled_reschedule_demo_menu.sql, retarget_existing_schedule_menus_to_generic.sql,
-- rename_schedule_status_menus_to_typecodename.sql, delete_old_combined_class_cancelled_menu.sql
-- (all deleted -- this is the only SQL file for this feature).
--
-- To add status #38 later: add one row to @Targets below (NewLink under
-- /lms/schedule-status/<slug>/, OldLink = NULL) and re-run this script, then re-login.

DECLARE @ScheduleParentId INT = 34;
DECLARE @SeedAdminUserId UNIQUEIDENTIFIER = '2A3971BA-B5B9-45E7-FCC3-08DCF1189F52';

-- All 37 config-driven pages: 32 net-new statuses + 5 migrated from standalone pages
-- (Demo Completed, Class Completed, Class Re-Scheduled, Class Scheduled, Re-Schedule Demo --
-- these carry an OldLink so their existing Menu row/permissions are repointed in place rather
-- than duplicated). Name values are the final TypeCodeName-exact text.
DECLARE @Targets TABLE (Name NVARCHAR(200), NewLink NVARCHAR(200), OldLink NVARCHAR(200) NULL);
INSERT INTO @Targets (Name, NewLink, OldLink) VALUES
    ('Class Canceled Tutor Not Available',      '/lms/schedule-status/class-cancelled-tutor-na/',            NULL),
    ('Class Canceled Student Not Available',    '/lms/schedule-status/class-cancelled-student-na/',          NULL),
    ('Dropped',                                 '/lms/schedule-status/dropped/',                             NULL),
    ('DP Long Followup',                        '/lms/schedule-status/dp-long-followup/',                    NULL),
    ('ReDemo',                                  '/lms/schedule-status/re-demo/',                              NULL),
    ('ShortFollowUp',                           '/lms/schedule-status/short-followup/',                       NULL),
    ('DP Short Followup',                       '/lms/schedule-status/dp-short-followup/',                    NULL),
    ('DP Parent Followup',                      '/lms/schedule-status/dp-parent-followup/',                   NULL),
    ('SalesFollowUp',                           '/lms/schedule-status/sales-followup/',                       NULL),
    ('Reject',                                  '/lms/schedule-status/reject/',                               NULL),
    ('Demo Cancelled',                          '/lms/schedule-status/demo-cancelled/',                       NULL),
    ('Demo Postponed',                          '/lms/schedule-status/demo-postponed/',                       NULL),
    ('DC Need to schedule',                     '/lms/schedule-status/dc-need-to-schedule/',                  NULL),
    ('Demo Scheduled',                          '/lms/schedule-status/demo-scheduled/',                       NULL),
    ('Class Postponed',                         '/lms/schedule-status/class-postponed/',                      NULL),
    ('Request for Re-schedule',                 '/lms/schedule-status/request-for-reschedule/',               NULL),
    ('Request for Quotation',                   '/lms/schedule-status/request-for-quotation/',                NULL),
    ('Tutor Changed Dropped',                   '/lms/schedule-status/tutor-changed-dropped/',                NULL),
    ('Demo Completed Feedback Pending',         '/lms/schedule-status/demo-completed-feedback-pending/',      NULL),
    ('Demo Reschedule Request',                 '/lms/schedule-status/demo-reschedule-request/',              NULL),
    ('Schedule Change Request',                 '/lms/schedule-status/schedule-change-request/',              NULL),
    ('DC Dropped',                              '/lms/schedule-status/dc-dropped/',                           NULL),
    ('DP Dropped',                              '/lms/schedule-status/dp-dropped/',                           NULL),
    ('DC Short Followup',                       '/lms/schedule-status/dc-short-followup/',                    NULL),
    ('DC Parent Followup',                      '/lms/schedule-status/dc-parent-followup/',                   NULL),
    ('DC Tutor Change',                         '/lms/schedule-status/dc-tutor-change/',                      NULL),
    ('On spot tutor cancellation',              '/lms/schedule-status/on-spot-tutor-cancellation/',           NULL),
    ('On spot student cancellation',            '/lms/schedule-status/on-spot-student-cancellation/',         NULL),
    ('Temporary Hold',                          '/lms/schedule-status/temporary-hold/',                       NULL),
    ('Permanent Hold',                          '/lms/schedule-status/permanent-hold/',                       NULL),
    ('Class Cancelled',                         '/lms/schedule-status/class-cancelled-legacy/',               NULL),
    ('Class Cancelled Student Not Available',   '/lms/schedule-status/class-cancelled-student-na-legacy/',    NULL),
    ('Demo Completed',                          '/lms/schedule-status/demo-completed/',      '/lms/demo-completed/'),
    ('Class Completed',                         '/lms/schedule-status/class-completed/',     '/lms/class-completed/'),
    ('Class Re-Scheduled',                      '/lms/schedule-status/class-rescheduled/',   '/lms/class-rescheduled/'),
    ('Class Scheduled',                         '/lms/schedule-status/class-scheduled/',     '/lms/class-scheduled/'),
    ('Re-Schedule Demo',                        '/lms/schedule-status/reschedule-demo/',     '/lms/reschedule-demo/');

-- 1. Retarget in place: rows still on their old static route get repointed to the new generic
--    route without changing MenuId, so their existing RoleMenuPermission rows stay valid.
UPDATE m
SET m.Link = t.NewLink, m.ModifiedDate = GETDATE()
FROM Menu m
INNER JOIN @Targets t ON t.OldLink = m.Link
WHERE m.ParentMenuId = @ScheduleParentId AND t.OldLink IS NOT NULL;

PRINT CAST(@@ROWCOUNT AS varchar) + ' Schedule menu row(s) retargeted from their old static route.';

-- 2. Insert any target whose NewLink doesn't exist yet -- covers the 32 net-new pages always, and
--    covers the 5 migrated pages on a fresh environment that never had the old static-route rows.
DECLARE @StartSortOrder INT = ISNULL((SELECT MAX(SortOrder) FROM Menu WHERE ParentMenuId = @ScheduleParentId), 0);

;WITH Missing AS (
    SELECT t.Name, t.NewLink, ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS rn
    FROM @Targets t
    WHERE NOT EXISTS (SELECT 1 FROM Menu m WHERE m.Link = t.NewLink AND m.ParentMenuId = @ScheduleParentId)
)
INSERT INTO Menu (Name, Description, IsMenu, IsParentMenu, ParentMenuId, Icon, Link, SortOrder, IsActive, CreatedDate, CreatedBy)
SELECT ms.Name, ms.Name, 1, 0, @ScheduleParentId, '', ms.NewLink, @StartSortOrder + ms.rn, 1, GETDATE(), @SeedAdminUserId
FROM Missing ms;

PRINT CAST(@@ROWCOUNT AS varchar) + ' Schedule menu row(s) inserted.';

-- 3. Name/Description sync: keeps the sidebar label matching TypeCodeName exactly even if a
--    stale name lingers from before this script existed. Keyed by Link (stable identifier).
--    Unconditional SET (not a Name<>NewName filter) because the default collation is
--    case-insensitive, which would silently skip case-only corrections (e.g. "On Spot" vs
--    "On spot") -- reassigning the same value on a match is a harmless no-op.
UPDATE m
SET m.Name = t.Name, m.Description = t.Name, m.ModifiedDate = GETDATE()
FROM Menu m
INNER JOIN @Targets t ON t.NewLink = m.Link
WHERE m.ParentMenuId = @ScheduleParentId;

PRINT CAST(@@ROWCOUNT AS varchar) + ' Schedule menu row(s) name-synced to TypeCodeName.';

-- 4. Grant the same role permissions as the stable "Need To Schedule" sibling (RoleId 3,4,5,6
--    with View/Add/Edit/Delete = 1, Report = 0). Idempotent via NOT EXISTS -- never overwrites an
--    already-customized permission row.
DECLARE @TemplateMenuId INT = (SELECT Id FROM Menu WHERE Name = 'Need To Schedule' AND ParentMenuId = @ScheduleParentId);

IF @TemplateMenuId IS NOT NULL
BEGIN
    INSERT INTO RoleMenuPermission (RoleId, MenuId, [View], [Add], [Edit], [Delete], [Report], IsActive, CreatedDate, CreatedBy)
    SELECT rmp.RoleId, target.MenuId, rmp.[View], rmp.[Add], rmp.[Edit], rmp.[Delete], 0, rmp.IsActive, GETDATE(), rmp.CreatedBy
    FROM (SELECT m.Id AS MenuId FROM Menu m INNER JOIN @Targets t ON t.NewLink = m.Link WHERE m.ParentMenuId = @ScheduleParentId) target
    CROSS JOIN RoleMenuPermission rmp
    WHERE rmp.MenuId = @TemplateMenuId
      AND NOT EXISTS (SELECT 1 FROM RoleMenuPermission x WHERE x.MenuId = target.MenuId AND x.RoleId = rmp.RoleId);

    PRINT CAST(@@ROWCOUNT AS varchar) + ' permission row(s) inserted (copied from Need To Schedule).';
END
ELSE
BEGIN
    PRINT 'Skipped permission grant: template menu ''Need To Schedule'' not found.';
END;

-- 5. Clean up the old combined "Class Cancelled" page (20021 + 20036), now split into
--    "Class Canceled Tutor Not Available" and "Class Canceled Student Not Available" above.
--    Keyed by its exact old static Link -- never touches the new "class-cancelled-legacy" page,
--    which shares the same Name ("Class Cancelled") but a different Link.
DECLARE @OldCombinedMenuId INT = (SELECT Id FROM Menu WHERE Link = '/lms/class-cancelled/' AND ParentMenuId = @ScheduleParentId);

IF @OldCombinedMenuId IS NOT NULL
BEGIN
    DELETE FROM RoleMenuPermission WHERE MenuId = @OldCombinedMenuId;
    DELETE FROM Menu WHERE Id = @OldCombinedMenuId;
    PRINT 'Old combined Class Cancelled menu (Id ' + CAST(@OldCombinedMenuId AS varchar) + ') and its permissions deleted.';
END
ELSE
BEGIN
    PRINT 'Old combined Class Cancelled menu not found -- already deleted or never existed.';
END;

-- Verify all Schedule submenu items
PRINT '';
PRINT 'Current Schedule submenu items:';
SELECT Id, Name, Description, Link, ParentMenuId, SortOrder, IsActive
FROM Menu
WHERE ParentMenuId = @ScheduleParentId
ORDER BY SortOrder;
