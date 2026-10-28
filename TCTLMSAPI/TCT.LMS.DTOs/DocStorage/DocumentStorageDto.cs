using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.DocStorage
{
    public class DocumentStorageDto
    {
        public IList<IFormFile> Files { get; set; }
        public DocumentDto Document { get; set; }
    }
}
