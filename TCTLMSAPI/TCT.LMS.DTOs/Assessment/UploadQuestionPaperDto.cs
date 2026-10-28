using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Http;

namespace TCT.LMS.DTOs.Assessment
{
    public class UploadQuestionPaperDto
    {
        public Guid TestScheduleId { get; set; }
        public Guid UploadedByUserId { get; set; }
        public string? Notes { get; set; }
        public IList<IFormFile> Files { get; set; } = new List<IFormFile>();
    }
}
