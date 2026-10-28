using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.Tutor
{
    public class TutorAccountStatusDto
    {
        public Guid TutorId { get; set; }
        public string TutorName { get; set; }
        public string Phone { get; set; }
        public decimal PaymentTillDate { get; set; }
        public bool IsActive { get; set; }
    }
}
