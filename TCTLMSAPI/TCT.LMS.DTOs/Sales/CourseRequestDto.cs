using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.Sales
{
    public class CourseRequestDto
    {
        public Guid Id { get; set; }
        public Guid SalesId { get; set; }
        public Guid Coordinator { get; set; }
        public Guid SubjectId { get; set; }
        public decimal? ParentPayment { get; set; }
        public string SubjectCode { get; set; } = string.Empty;
        public string AuthorBookDetails { get; set; } = string.Empty;
        public string NoOfSessionPerWeek { get; set; } = string.Empty;
        public DateTime? DemoDate { get; set; }
        public bool? IsPaidDemo { get; set; }
        public Guid? TutorId { get; set; }
        public Guid? StudentId { get; set; }
        public decimal? TutorPayment { get; set; }
        public Guid UserId { get; set; }
        public DateTime CreatedDate { get; set; }
        public Guid CreatedBy { get; set; }
    }
}
