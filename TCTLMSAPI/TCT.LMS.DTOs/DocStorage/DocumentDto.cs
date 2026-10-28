using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Domain;

namespace TCT.LMS.DTOs.DocStorage
{
    public class DocumentDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string DocumentName { get; set; }
        public string DocumentDescription { get; set; } = string.Empty;
        public Guid? ReferenceId { get; set; }
        public Guid? DocumentTypeId { get; set; }
    }
}
