using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.Invoice
{
    public class CreateInvoiceRequest
    {
        public Guid StudentId { get; set; }
        public int Month { get; set; }
        public int Year { get; set; }
        public Guid CreatedBy { get; set; }
    }
}
