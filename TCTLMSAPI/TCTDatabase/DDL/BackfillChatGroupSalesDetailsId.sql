/*
    Links existing chat groups to their course enrolment (SalesDetails) so the
    two-hour class reminder can be posted to the correct group chat.
    Groups created before Groups.SalesDetailsId existed, or reused on a later
    tutor assignment, were left with a NULL SalesDetailsId.
    Safe to run repeatedly in every environment.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

;WITH Candidates AS
(
    SELECT
        g.Id AS GroupId,
        sd.Id AS SalesDetailsId,
        ROW_NUMBER() OVER (PARTITION BY g.Id ORDER BY sd.CreatedDate DESC) AS GroupRank
    FROM dbo.Groups g
    JOIN dbo.Sales s
        ON s.StudentId = g.StudentId
       AND s.BoardId = g.BoardId
       AND s.GradeId = g.GradeId
       AND s.IsActive = 1
    JOIN dbo.SalesDetails sd
        ON sd.SalesId = s.Id
       AND sd.SubjectId = g.SubjectId
       AND sd.IsActive = 1
    WHERE g.Active = 1
      AND g.SalesDetailsId IS NULL
)
UPDATE g
SET g.SalesDetailsId = c.SalesDetailsId
FROM dbo.Groups g
JOIN Candidates c ON c.GroupId = g.Id
WHERE c.GroupRank = 1;
GO
