using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.Domain.Entities
{
    public class Group
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Theme { get; set; }
        public string? ChatTheme { get; set; }
        public bool Unread { get; set; } = false;
        public bool Archive { get; set; } = false;
        public DateTime Created { get; set; }
        public bool Active { get; set; } = false;
        public string? Delivered { get; set; }
        public bool? Channel { get; set; } = false;
        public Guid? StudentId { get; set; }
        public Guid? TutorId { get; set; }
        public Guid? SubjectId { get; set; }
        public Guid? GradeId { get; set; }
        public Guid? BoardId { get; set; }
        public string? Description { get; set; }
        public Guid? CreatedBy { get; set; }
        public DateTime? ModifiedDate { get; set; }
        public Guid? ModifiedBy { get; set; }
        public string? GroupName { get; set; }
        public Guid? SalesDetailsId { get; set; }
    }
}
