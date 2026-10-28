using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.Invoice
{
    public class CreateInvoiceResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public string? InvoiceNumber { get; set; }
        public List<string> Errors { get; set; } = new List<string>();
    }
}
