namespace TCT.LMS.DTOs.Invoice
{
    // An advance invoice raised automatically when a subject's regular classes are scheduled for the first
    // time after its demo. It bills that first month's scheduled classes and replaces the month-end invoice
    // for that subject and month. Accounts send it to the parent (EmailSentDate is set then).
    public class AdvanceInvoiceDto
    {
        public string InvoiceNumber { get; set; } = "";
        public string Subject { get; set; } = "";
        public int Month { get; set; }
        public int Year { get; set; }
        public int NumberOfClasses { get; set; }
        public decimal ParentPayment { get; set; }
        public decimal TotalAmount { get; set; }
        public DateTime CreatedDate { get; set; }
        public DateTime? EmailSentDate { get; set; }
    }

    public class AdvanceInvoiceSendResultDto
    {
        public bool Succeeded { get; set; }
        public string Message { get; set; } = "";
        public DateTime? EmailSentDate { get; set; }
    }
}
