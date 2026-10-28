using System;

namespace TCT.LMS.DTOs.Assessment
{
    public class AnswerSheetSubmissionListItemDto
    {
        public Guid Id { get; set; }
        public Guid TestScheduleId { get; set; }
        public string StudentName { get; set; }
        public string SubjectName { get; set; }
        public DateTime ExamDate { get; set; }
        public DateTime SubmittedOn { get; set; }
        public string EvaluationStatus { get; set; }
        public decimal? MarksObtained { get; set; }
        public decimal? MaxMarks { get; set; }
        public string? Feedback { get; set; }
        public bool IsLateSubmission { get; set; }
    }
}
