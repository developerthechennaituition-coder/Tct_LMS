using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace TCT.LMS.Domain.Entities
{
    public class GroupMember
    {
        [Key]
        public Guid Id { get; set; }
       
        public Guid GroupId { get; set; }
        
        public Guid UserId { get; set; } // UNIQUEIDENTIFIER maps to Guid in C#

        // Navigation Properties
        public Group? Group { get; set; }
        public User? User { get; set; }
        public bool IsAdmin { get; set; }
        public bool IsActive { get; set; }
        
    }
}
