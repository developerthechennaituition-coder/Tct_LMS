/*
    Align the invoice tables with the API's StudentInvoice and
    StudentInvoiceDetails models. Run against the database used by TCTDb.
    Safe to re-run; existing values are left unchanged.
*/
SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.StudentInvoice', N'U') IS NULL
    THROW 50001, 'dbo.StudentInvoice does not exist in the selected database.', 1;

IF OBJECT_ID(N'dbo.StudentInvoiceDetails', N'U') IS NULL
    THROW 50002, 'dbo.StudentInvoiceDetails does not exist in the selected database.', 1;

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.StudentInvoice') AND name = N'InvoiceType'
)
    ALTER TABLE dbo.StudentInvoice ADD InvoiceType NVARCHAR(20) NULL;

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.StudentInvoice') AND name = N'PaymentUrl'
)
    ALTER TABLE dbo.StudentInvoice ADD PaymentUrl NVARCHAR(MAX) NULL;

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.StudentInvoiceDetails') AND name = N'SubjectAmount'
)
    ALTER TABLE dbo.StudentInvoiceDetails ADD SubjectAmount DECIMAL(18, 2) NULL;

COMMIT TRANSACTION;

SELECT DB_NAME() AS DatabaseName, OBJECT_NAME(object_id) AS TableName, name AS ColumnName
FROM sys.columns
WHERE (object_id = OBJECT_ID(N'dbo.StudentInvoice') AND name IN (N'InvoiceType', N'PaymentUrl'))
   OR (object_id = OBJECT_ID(N'dbo.StudentInvoiceDetails') AND name = N'SubjectAmount')
ORDER BY TableName, ColumnName;
