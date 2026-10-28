/*
    Adds per-subject billed amount to StudentInvoiceDetails.

    Why: an invoice stores ONE total (StudentInvoice.TotalInvoiceAmount) but a student can
    be billed for several subjects on it. Without a per-subject amount, the PDF can only
    show one line, which is why multi-subject invoices currently render just the first
    subject against the combined total. This column lets the template list each subject
    with its own amount.

    Nullable: existing invoice-detail rows stay NULL and the template falls back to the
    invoice-level total for them, so old invoices are unaffected.

    Idempotent - safe to re-run.
*/
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.StudentInvoiceDetails')
      AND name = 'SubjectAmount'
)
BEGIN
    ALTER TABLE dbo.StudentInvoiceDetails
        ADD SubjectAmount DECIMAL(18,2) NULL;
END
GO
