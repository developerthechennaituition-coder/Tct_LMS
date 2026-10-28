using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.User
{
    public class UserProfileDto
    {
        public Guid UserId { get; set; }
        public IList<IFormFile> Files { get; set; }
        public string DocumentName { get; set; }
        public string DocumentDescription { get; set; }
    }
}
