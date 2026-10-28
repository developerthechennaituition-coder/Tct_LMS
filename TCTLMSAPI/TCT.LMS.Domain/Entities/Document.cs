using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection.Metadata;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.Domain.Entities
{
    public class Document : BaseEntity
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string DocumentName { get; set; }
        public string DocumentDescription { get; set; } = string.Empty;
        public Guid? ReferenceId { get; set; }
        public Guid? DocumentTypeId { get; set; }
    }
}
