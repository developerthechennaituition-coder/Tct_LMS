ALTER TABLE dbo.ScheduleDetails
ADD OperationScheduleStatus uniqueidentifier NULL;

ALTER TABLE dbo.ScheduleDetails
ALTER COLUMN Comment varchar(50) NULL;