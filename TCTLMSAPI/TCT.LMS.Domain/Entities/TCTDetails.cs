using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.Domain.Entities
{
    public class TCTDetails
    {
        [Key]
        public int? Id { get; set; }

        public string? Title { get; set; }

        public string? Address1 { get; set; }

        public string? Address2 { get; set; }

        public string? City { get; set; }

        public string? Zip { get; set; }

        public string? State { get; set; }

        public string? Country { get; set; }

        public string? Email { get; set; }

        public string? Phone { get; set; }

        public string? GSTIN { get; set; }

        public string? PAN { get; set; }
        public string? HSNCode { get; set; }
    }
}
