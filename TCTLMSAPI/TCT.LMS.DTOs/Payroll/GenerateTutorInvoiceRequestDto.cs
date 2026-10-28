using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.Payroll
{
    public class GenerateTutorInvoiceRequestDto
    {
        public int InputYear { get; set; }
        public int InputMonth { get; set; }
        public Guid TutorId { get; set; }
        public Guid CreatedBy { get; set; }
    }
}
