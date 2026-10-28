/*
    Cleanup: orphan Schedule headers left by the auto-rollover bug.

    Background
    ----------
    ScheduleRepository.AddOrUpdateSchedule never set Response.Succeeded = true, so the
    next-month rollover always took its failure branch AFTER the Schedule header row had
    already been committed - but BEFORE any ScheduleDetails were written. Every Ops
    approval that triggered a rollover therefore left a Schedule row with zero classes.

    The code now (a) sets Succeeded correctly, (b) requires at least one active
    ScheduleDetails row before treating a month as "already scheduled", and
    (c) deactivates the header itself if no classes could be created. So these orphans no
    longer block anything - this script is hygiene, not a prerequisite.

    Run STEP 1, eyeball the output, then run STEP 2 only if it looks right.
*/

--------------------------------------------------------------------------------
-- STEP 0 - Verify the lookup values the rollover gate depends on. Read-only.
--
-- The gate resolves status ids by TypeCodeValue:
--   * Ops sign-off  -> 1013001/1013002/1013003 (all three mean approved)
--   * Tutor/student -> 1009001 or 20020, or name 'Class Completed'
--   * Never-ran     -> 1009002/1009003/1009005/1009006/1009007
--
-- Each 'ops-approved' row below must be present, or that Ops selection will never
-- trigger a rollover. Re-run this after any change to the Class Attendance Status
-- lookup - a NEW value added to group 1013 will NOT count as approved until it is
-- added to OpsApprovedStatusValues in ScheduleRepository.cs (fails closed by design).
--------------------------------------------------------------------------------
SELECT Id, TypeCodeValue, TypeCodeName, 'ops-approved' AS Purpose
FROM Type_Code
WHERE TypeCodeValue IN (1013001, 1013002, 1013003)
UNION ALL
SELECT Id, TypeCodeValue, TypeCodeName, 'class-completed'
FROM Type_Code
WHERE TypeCodeValue IN (1009001, 20020)
   OR LOWER(LTRIM(RTRIM(TypeCodeName))) = 'class completed'
UNION ALL
SELECT Id, TypeCodeValue, TypeCodeName, 'never-ran'
FROM Type_Code
WHERE TypeCodeValue IN (1009002, 1009003, 1009005, 1009006, 1009007);

-- Drift check: any group 1013 value NOT treated as approved by the code.
-- Expected result today: zero rows.
SELECT TC.Id, TC.TypeCodeValue, TC.TypeCodeName, 'UNRECOGNISED - will not roll over' AS Warning
FROM Type_Code TC
INNER JOIN TypeGroup TG ON TG.Id = TC.TypeGroupId
WHERE TG.TypeGroupCode = 1013
  AND TC.TypeCodeValue NOT IN (1013001, 1013002, 1013003)
ORDER BY TC.TypeCodeValue;

--------------------------------------------------------------------------------
-- STEP 1 - Review. Read-only. Lists active Schedule headers with no active classes.
--------------------------------------------------------------------------------
SELECT
    SH.ScheduleId,
    SH.SalesDetailsId,
    SH.StudentId,
    SH.TutorId,
    SJ.TypeCodeName          AS Subject,
    CONCAT(US.FirstName, ' ', US.LastName) AS StudentName,
    SH.StartDate,
    SH.EndDate,
    SH.CreatedDate,
    SH.CreatedBy,
    (SELECT COUNT(*) FROM ScheduleDetails D
      WHERE D.ScheduleId = SH.ScheduleId)                  AS TotalDetailRows,
    (SELECT COUNT(*) FROM ScheduleDetails D
      WHERE D.ScheduleId = SH.ScheduleId AND D.IsActive = 1) AS ActiveDetailRows
FROM Schedule SH
LEFT JOIN SalesDetails SA ON SA.Id = SH.SalesDetailsId
LEFT JOIN Type_Code   SJ ON SJ.Id = SA.SubjectId
LEFT JOIN Student     ST ON ST.Id = SH.StudentId
LEFT JOIN [User]      US ON US.Id = ST.UserId
WHERE SH.IsActive = 1
  AND NOT EXISTS (
        SELECT 1 FROM ScheduleDetails D
        WHERE D.ScheduleId = SH.ScheduleId AND D.IsActive = 1
  )
ORDER BY SH.CreatedDate DESC;

--------------------------------------------------------------------------------
-- STEP 2 - Soft-delete. Review STEP 1 output first, then uncomment and run.
--
-- NOTE: a schedule created seconds ago by a normal user flow can briefly look like an
-- orphan (header written, classes still being inserted). The AND SH.CreatedDate <
-- DATEADD(HOUR, -1, GETDATE()) guard keeps this from catching in-flight work.
--------------------------------------------------------------------------------
/*
BEGIN TRANSACTION;

UPDATE SH
SET SH.IsActive     = 0,
    SH.ModifiedDate = GETDATE()
FROM Schedule SH
WHERE SH.IsActive = 1
  AND SH.CreatedDate < DATEADD(HOUR, -1, GETDATE())
  AND NOT EXISTS (
        SELECT 1 FROM ScheduleDetails D
        WHERE D.ScheduleId = SH.ScheduleId AND D.IsActive = 1
  );

-- Confirm the row count matches STEP 1, then:
--   COMMIT TRANSACTION;
-- or, if it does not:
--   ROLLBACK TRANSACTION;
*/
