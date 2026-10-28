/*
    Adds InvoiceType to StudentInvoice (prepaid v2, Phase 3).

    Classifies each invoice so the UI can render the right layout:
      NULL / 'Regular'  - normal monthly hours x rate charge (Scenario 2)
      'Upfront'         - single full-term prepaid invoice (Phase 2)
      'Statement'       - informational monthly consumption statement (Phase 3)
      'TopUp'           - Scenario-3 balance invoice for remaining classes (Phase 4)

    Idempotent - safe to re-run.
*/
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.StudentInvoice') AND name = 'InvoiceType')
    ALTER TABLE dbo.StudentInvoice ADD InvoiceType NVARCHAR(20) NULL;
GO
