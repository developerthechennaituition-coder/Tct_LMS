using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.Domain.Entities
{
    public class StudentRegistration : BaseEntity
    {
        public Guid Id { get; set; }
        public Guid StudentId { get; set; }

        public string StudentName { get; set; }

        public string ParentName { get; set; }

        public string ParentOccupation { get; set; }

        public string ParentMobile { get; set; }

        public string ParentEmail { get; set; }

        public Guid Subject { get; set; }

        public string Curriculum { get; set; }

        public string Location { get; set; }

        public string SchoolName { get; set; }

        public string IdProofFileName { get; set; }

        public string Address { get; set; }

        public decimal FeesPerHour { get; set; }

        public string DemoFeedback { get; set; }

        public bool TermsAccepted { get; set; }

        // Month (1-12) of the student's annual exam. Drives the class auto-schedule check.
        public int? AnnualExamMonth { get; set; }
    }
}
