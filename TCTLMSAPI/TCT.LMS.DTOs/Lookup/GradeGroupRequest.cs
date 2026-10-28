using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.Lookup
{
    public class GradeGroupRequest
    {
        public List<Guid> BoardIds { get; set; } = new();
        public List<Guid>? GroupIds { get; set; }
    }
}
