using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace TCT.LMS.Domain.Entities
{
    public class GroupMessage
    {
        public int Id { get; set; }
        public int GroupId { get; set; }
        public Guid SenderId { get; set; } // UNIQUEIDENTIFIER maps to Guid in C#
        public string? Message { get; set; }
        public DateTime Date { get; set; }
        public bool IsMeta { get; set; } = false;

        // Navigation Properties
        public System.Text.RegularExpressions.Group? Group { get; set; }
        public User? Sender { get; set; }
        public MetaMessage? MetaMessage { get; set; }
    }
}
