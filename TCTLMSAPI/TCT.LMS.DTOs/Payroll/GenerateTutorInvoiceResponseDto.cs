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
        public string? EmailError { get; set; }
    }
}
