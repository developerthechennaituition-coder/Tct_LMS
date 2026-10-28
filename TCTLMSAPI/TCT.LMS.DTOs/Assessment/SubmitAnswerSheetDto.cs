using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Http;

namespace TCT.LMS.DTOs.Assessment
{
    public class SubmitAnswerSheetDto
    {
        public Guid TestScheduleId { get; set; }
        public Guid StudentId { get; set; }
        public IList<IFormFile> Files { get; set; } = new List<IFormFile>();
    }
}
