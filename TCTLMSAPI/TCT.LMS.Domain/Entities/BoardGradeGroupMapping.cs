using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.Domain.Entities
{
    public class BoardGradeGroupMapping : BaseEntity
    {
        [Key]
        public Guid Id { get; set; }
        public Guid BoardId { get; set; }
        public Guid GradeId { get; set; }
        public Guid GroupId { get; set; } 
    }
}
