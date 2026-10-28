/*
    Adds the course-enrollment link used by automatically created chat groups.
    Safe to run repeatedly in every environment.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF COL_LENGTH('dbo.Groups', 'SalesDetailsId') IS NULL
BEGIN
    ALTER TABLE dbo.Groups
        ADD SalesDetailsId UNIQUEIDENTIFIER NULL;
END;
GO

IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_Group_SalesDetailsId'
      AND object_id = OBJECT_ID('dbo.Groups')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_Group_SalesDetailsId
        ON dbo.Groups(SalesDetailsId)
        WHERE SalesDetailsId IS NOT NULL;
END;
GO
