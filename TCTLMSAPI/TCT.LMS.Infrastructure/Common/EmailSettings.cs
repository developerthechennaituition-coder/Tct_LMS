namespace TCT.LMS.Infrastructure.Common
{
    public class EmailSettings
    {
        public string SmtpServer { get; set; } = string.Empty;
        public int SmtpPort { get; set; } = 587;
        public string FromEmail { get; set; } = string.Empty;
        public string FromPassword { get; set; } = string.Empty;
        public string FromName { get; set; } = "The Chennai Tuition";
    }

    public class InvoiceEmailData
    {
        // Reconciliation must not report delivery success when SMTP failed.
        public bool ThrowOnFailure { get; set; }
        public string ToEmail { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public string ParentName { get; set; } = string.Empty;
        public string InvoiceNumber { get; set; } = string.Empty;
        public string MonthYear { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public string? PaymentUrl { get; set; }
        public string? Grade { get; set; }
        public string? Board { get; set; }
        public DateTime DueDate { get; set; }
        public List<InvoiceLineItem> LineItems { get; set; } = new();
    }

    public class InvoiceLineItem
    {
        public string Subject { get; set; } = string.Empty;
        public string TutorName { get; set; } = string.Empty;
        public int NumberOfClasses { get; set; }
        public decimal ParentPayment { get; set; }
        public decimal TotalAmount { get; set; }
        public string StartDate { get; set; } = string.Empty;
        public int PreviousMonthTotalClasses { get; set; }
        public int PreviousMonthPendingClasses { get; set; }
        public string PreviousMonthPeriod { get; set; } = string.Empty;
        public decimal PreviousMonthAdjustment { get; set; }
    }
}
