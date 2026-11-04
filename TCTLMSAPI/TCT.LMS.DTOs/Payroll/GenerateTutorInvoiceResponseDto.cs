using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.Payroll
{
    public class GenerateTutorInvoiceResponseDto
    {
        public long? InvoiceId { get; set; }
        public string? InvoiceNumber { get; set; }
        public decimal? TotalPayment { get; set; }
        // Tutor cancellation deductions applied to this pay slip (TotalPayment is after them).
        public decimal? TotalDeductions { get; set; }
        // Tutor cancellations not deducted because it is not certain whether they were re-scheduled (for review).
        public int UncertainCancellations { get; set; }
        public string? EmailError { get; set; }
    }
}
