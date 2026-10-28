-- Class status edit requests: a tutor or student asks Operations to unlock a class status they already saved.
-- Status: 1 Pending, 2 Approved (editable once), 3 Rejected, 4 Used (approved and saved again).
-- New table only, no change to existing data. Safe to re-run.
SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.ClassStatusEditRequest', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ClassStatusEditRequest
    (
        Id                UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_ClassStatusEditRequest PRIMARY KEY,
        ScheduleDetailsId UNIQUEIDENTIFIER NOT NULL,
        SalesDetailsId    UNIQUEIDENTIFIER NOT NULL,
        RequestedBy       UNIQUEIDENTIFIER NOT NULL,
        RequesterType     NVARCHAR(10)     NOT NULL CONSTRAINT CK_ClassStatusEditRequest_RequesterType CHECK (RequesterType IN ('tutor', 'student')),
        Reason            NVARCHAR(500)    NULL,
        Status            INT              NOT NULL CONSTRAINT CK_ClassStatusEditRequest_Status CHECK (Status IN (1, 2, 3, 4)),
        DecidedBy         UNIQUEIDENTIFIER NULL,
        DecidedDate       DATETIME2        NULL,
        DecisionComment   NVARCHAR(500)    NULL,
        CreatedDate       DATETIME2        NOT NULL,
        CONSTRAINT FK_ClassStatusEditRequest_ScheduleDetails FOREIGN KEY (ScheduleDetailsId) REFERENCES dbo.ScheduleDetails (ScheduleDetailsId)
    );
    CREATE INDEX IX_ClassStatusEditRequest_ScheduleDetails ON dbo.ClassStatusEditRequest (ScheduleDetailsId, RequestedBy);
END

COMMIT TRANSACTION;
