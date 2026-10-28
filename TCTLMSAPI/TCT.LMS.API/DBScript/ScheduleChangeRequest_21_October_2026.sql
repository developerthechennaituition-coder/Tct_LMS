-- Schedule Calendar: tutors' and students' requests to add class day(s), approved or rejected by Operations.
-- Status: 1 Pending, 2 Approved (classes added), 3 Rejected. Weeks: 1-4, 0 = Permanent.
-- New table only, no change to existing data. Safe to re-run.
SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.ScheduleChangeRequest', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ScheduleChangeRequest
    (
        Id              UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_ScheduleChangeRequest PRIMARY KEY,
        SalesDetailsId  UNIQUEIDENTIFIER NOT NULL,
        RequestedBy     UNIQUEIDENTIFIER NOT NULL,
        RequesterType   NVARCHAR(10)     NOT NULL CONSTRAINT CK_ScheduleChangeRequest_RequesterType CHECK (RequesterType IN ('tutor', 'student')),
        FromDate        DATE             NOT NULL,
        Days            NVARCHAR(20)     NOT NULL,
        StartTime       NVARCHAR(5)      NOT NULL,
        EndTime         NVARCHAR(5)      NOT NULL,
        Weeks           INT              NOT NULL CONSTRAINT CK_ScheduleChangeRequest_Weeks CHECK (Weeks BETWEEN 0 AND 4),
        Summary         NVARCHAR(300)    NULL,
        Status          INT              NOT NULL CONSTRAINT CK_ScheduleChangeRequest_Status CHECK (Status IN (1, 2, 3)),
        DecidedBy       UNIQUEIDENTIFIER NULL,
        DecidedDate     DATETIME2        NULL,
        DecisionComment NVARCHAR(500)    NULL,
        CreatedDate     DATETIME2        NOT NULL,
        CONSTRAINT FK_ScheduleChangeRequest_SalesDetails FOREIGN KEY (SalesDetailsId) REFERENCES dbo.SalesDetails (Id)
    );
    CREATE INDEX IX_ScheduleChangeRequest_SalesDetails ON dbo.ScheduleChangeRequest (SalesDetailsId, Status);
END

COMMIT TRANSACTION;
