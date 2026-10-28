using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Domain;

namespace TCT.LMS.DTOs.Student
{
    public class StudentRegistrationDto
    {
        public Guid? UserId { get; set; }
        public string StudentName { get; set; }
        public string ParentName { get; set; }
        public string ParentOccupation { get; set; }
        public string ParentMobile { get; set; }
        public string ParentEmail { get; set; }

        // Educational information
        public Guid Subject { get; set; }
        public string Curriculum { get; set; }
        public string Location { get; set; }
        public string SchoolName { get; set; }

        // Address and payment
        public string Address { get; set; }
        public decimal FeesPerHour { get; set; }
        public string DemoFeedback { get; set; }
        public bool TermsAccepted { get; set; }

        // Month (1-12) of the student's annual exam. Drives the class auto-schedule check.
        public int? AnnualExamMonth { get; set; }

        // File upload
        public IList<IFormFile> Files { get; set; }

        public Guid? CreatedBy { get; set; }
        public DateTime? CreatedDate { get; set; }
        public Guid? ModifiedBy { get; set; }
        public DateTime? ModifiedDate { get; set; }
        public bool? IsActive { get; set; }
    }
}
