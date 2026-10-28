using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.Student
{
    public class StudentAccountStatusDto
    {
        public Guid StudentId { get; set; }
        public Guid UserId { get; set; }
        public string StudentName { get; set; }
        public string BoardAndGrade { get; set; }
        public string Phone { get; set; }
        public string Category { get; set; }   // High Risk / Low Risk
        public decimal PaymentTillDate { get; set; }
        public bool IsActive { get; set; }
    }
}
