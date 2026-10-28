using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.TutorStudentAllocation
{
    public class TutorStudentAllocationRequestDto
    {
        public Guid Id { get; set; }    
        public Guid StudentId { get; set; }
        public Guid TutorId { get; set; }
        public Guid SalesDetailsId { get; set; }
        public decimal PaymentAmount { get; set; } = decimal.Zero;
        public int? StatusCode { get; set; }   // Assigned = 1, Dropped = 2, Completed = 3
        public string Note { get; set; }
        public Guid UserId { get; set; }
    }
}
