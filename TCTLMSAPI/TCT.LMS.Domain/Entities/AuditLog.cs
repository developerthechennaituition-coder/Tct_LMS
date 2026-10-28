using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.Domain.Entities
{
    public class AuditLog
    {
        [Key]
        public int AuditId { get; set; }
        public string TableName { get; set; }
        public string Action { get; set; }
        public string KeyValues { get; set; }
        public string OldValues { get; set; }
        public string NewValues { get; set; }
        public string ChangedBy { get; set; }
        public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
    }
}
