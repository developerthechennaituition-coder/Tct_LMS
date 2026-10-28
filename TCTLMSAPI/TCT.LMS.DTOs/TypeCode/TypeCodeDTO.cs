using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Domain;

namespace TCT.LMS.DTOs.TypeCode
{
    public class TypeCodeDTO : BaseEntity
    {
        public Guid Id { get; set; }
        public Guid? TypeGroupId { get; set; }
        public int TypeCodeValue { get; set; }
        public string? TypeCodeName { get; set; }
        public string? TypeCodeDescription { get; set; }
    }
}
