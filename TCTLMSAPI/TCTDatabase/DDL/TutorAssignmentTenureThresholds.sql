-- Tutor tenure assignment limits (TutorAssignmentThresholdRules.EvaluateTenure in the API), for every role:
--   active students (distinct students on the tutor's active courses) by days since the tutor's joining date:
--   fewer than 15 days: 1; 15-29 days: 3; 30-59 days: 6; 60-89 days: 10; 90+ days: 15;
--   a 90+ day tutor with 15-19 active students needs Super Admin approval (a Super Admin may assign directly);
--   at 20 active students the tutor is unavailable for every role.
-- Additive only and re-runnable: adds the eleven Threshold Configuration rows, only where a row with that
-- ThresholdName does not exist yet. No existing table, row or threshold value is changed.
-- Run on the LMS database after taking a backup, BEFORE deploying the API build with tenure limits: until these
-- rows exist (all active, valid) every tutor assignment is refused (fail safe).

SET XACT_ABORT ON;
BEGIN TRANSACTION;

INSERT INTO dbo.Thresholds (Id, EntityType, GroupKey, ThresholdName, Value, Unit, Description, IsActive, CreatedDate, CreatedBy)
SELECT NEWID(), 'Tutor', 'TutorAssignTenure', v.ThresholdName, v.Value, v.Unit, v.Description, 1, GETDATE(),
       '00000000-0000-0000-0000-000000000000'
FROM (VALUES
    ('TutorTenureBand1Days',             15, 'days',  'Band 1: tutors with fewer days than this since joining'),
    ('TutorTenureBand1MaxStudents',      1,  'count', 'Band 1: maximum active students'),
    ('TutorTenureBand2Days',             30, 'days',  'Band 2: tutors with fewer days than this since joining'),
    ('TutorTenureBand2MaxStudents',      3,  'count', 'Band 2: maximum active students'),
    ('TutorTenureBand3Days',             60, 'days',  'Band 3: tutors with fewer days than this since joining'),
    ('TutorTenureBand3MaxStudents',      6,  'count', 'Band 3: maximum active students'),
    ('TutorTenureBand4Days',             90, 'days',  'Band 4: tutors with fewer days than this since joining'),
    ('TutorTenureBand4MaxStudents',      10, 'count', 'Band 4: maximum active students'),
    ('TutorTenureStandardMaxStudents',   15, 'count', 'Tutors past band 4: maximum active students without Super Admin approval'),
    ('TutorTenureSuperAdminMaxStudents', 20, 'count', 'Hard cap: at this many active students the tutor is unavailable for every role'),
    ('TutorTenureNewBadgeDays',          30, 'days',  'Tutors with fewer days than this since joining')
) AS v (ThresholdName, Value, Unit, Description)
WHERE NOT EXISTS (SELECT 1 FROM dbo.Thresholds t WHERE t.ThresholdName = v.ThresholdName);

COMMIT TRANSACTION;
GO
