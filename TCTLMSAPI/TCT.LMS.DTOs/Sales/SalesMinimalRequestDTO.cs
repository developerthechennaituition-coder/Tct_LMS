using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Domain;
using TCT.LMS.DTOs.Student;

namespace TCT.LMS.DTOs.Sales
{
    public class SalesMinimalRequestDTO : BaseEntity
    {
        public Guid? Id { get; set; }

        [ForeignKey("Student")]
        public Guid StudentId { get; set; }
        public Guid? BoardId { get; set; }
        public Guid? GradeId { get; set; }
        public string? ParentsInterestedLevel { get; set; }
        public IList<IFormFile> Files { get; set; }
        public StudentRequestDto? Student { get; set; }
        public List<SalesDetailsMinimalRequestDto>? SalesDetailRequest { get; set; }
    }
}
