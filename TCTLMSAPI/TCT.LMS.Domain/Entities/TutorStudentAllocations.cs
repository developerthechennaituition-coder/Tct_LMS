using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.Domain.Entities
{
    public class TutorStudentAllocations : BaseEntity
    {
        public Guid Id { get; set; }
        // Foreign Keys
        public Guid StudentId { get; set; }
        public Guid TutorId { get; set; }
        public Guid SalesDetailsId { get; set; }

        // Extra Allocation Details
        public decimal PaymentAmount { get; set; }
        public int? StatusCode { get; set; }   // Assigned = 1, Dropped = 2, Completed = 3 (example enum)
        public string Note { get; set; }

        // Navigation Properties
        public Student Student { get; set; }
        public Tutor Tutor { get; set; }
    }
}
