using System;

namespace TCT.LMS.DTOs.Assessment
{
    public class StudentTestPaperDto
    {
        public Guid Id { get; set; }
        public string SubjectName { get; set; }
        public string BoardName { get; set; }
        public string GradeName { get; set; }
        public DateTime ExamDate { get; set; }
        public string ExamStartTime { get; set; }
        public int ExamDurationMinutes { get; set; }
        public bool QuestionPaperUploaded { get; set; }
        public bool AnswerSheetSubmitted { get; set; }
        public Guid? SubmissionId { get; set; }
        public string EvaluationStatus { get; set; }
        public decimal? MarksObtained { get; set; }
        public decimal? MaxMarks { get; set; }
        public string Feedback { get; set; }
        public string? QuestionPaperNotes { get; set; }
        public DateTimeOffset StartsAt { get; set; }
        public DateTimeOffset EndsAt { get; set; }
        public DateTimeOffset ServerNow { get; set; }
        public bool IsLateSubmission { get; set; }
    }
}
