using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.Domain.Entities
{
    public class MetaMessage
    {
        public int Id { get; set; }
        public int GroupMessageId { get; set; }
        public string? MetaText { get; set; }

        // Navigation Properties
        public GroupMessage? GroupMessage { get; set; }
    }
}
