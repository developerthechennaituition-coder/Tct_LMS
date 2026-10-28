using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.Infrastructure.Common
{
    public class AuditOptions
    {
        public HashSet<string> IncludedTables { get; set; } = new();
        public Dictionary<string, HashSet<string>> IncludedColumnsPerTable { get; set; } = new();
    }
}
