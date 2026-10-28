using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Domain;

namespace TCT.LMS.DTOs.Lookup
{
    public class TypeGroupDTO : BaseEntity
    {
        public Guid Id { get; set; }
        public string? TypeGroupName { get; set; }
        public string? TypeGroupDescription { get; set; }
        public int TypeGroupCode { get; set; }
    }
}
