/*
    Adds the upfront-invoice reference column to StudentPaymentPlan (prepaid v2, Phase 2).

    When a prepaid plan is approved, ONE upfront full-period invoice is raised covering the
    whole plan window (e.g. 6 months, all subjects as line items). UpfrontInvoiceNumber records
    that invoice on every plan it covers, so re-generating returns the same invoice instead of
    raising a duplicate, and the UI can link back to it.

    Idempotent - safe to re-run.
*/
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.StudentPaymentPlan') AND name = 'UpfrontInvoiceNumber')
    ALTER TABLE dbo.StudentPaymentPlan ADD UpfrontInvoiceNumber NVARCHAR(50) NULL;
GO
