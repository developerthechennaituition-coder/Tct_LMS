using System;

namespace TCT.LMS.DTOs.Assessment
{
    public class EvaluateAnswerSheetDto
    {
        public decimal MarksObtained { get; set; }
        public decimal MaxMarks { get; set; }
        public string? Feedback { get; set; }
        public Guid EvaluatedByUserId { get; set; }
    }
}
