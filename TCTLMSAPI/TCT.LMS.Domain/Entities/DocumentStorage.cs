using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.Domain.Entities
{
    public class DocumentStorage : BaseEntity
    {
        public Guid Id { get; set; }
        public Guid DocumentId { get; set; }
        public string FileName { get; set; }
        public string ContentType { get; set; }
        public string FileSize { get; set; }
        public string FilePath { get; set; }

    }
}
