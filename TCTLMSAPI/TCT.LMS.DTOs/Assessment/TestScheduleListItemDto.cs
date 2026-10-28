using System;

namespace TCT.LMS.DTOs.Assessment
{
    public class TestScheduleListItemDto
    {
        public Guid Id { get; set; }
        public Guid StudentId { get; set; }
        public string StudentName { get; set; }
        public string TutorName { get; set; } = "";
        public string? QuestionPaperNotes { get; set; }
        public DateTimeOffset StartsAt { get; set; }
        public DateTimeOffset EndsAt { get; set; }
        public string SubjectName { get; set; }
        public string BoardName { get; set; }
        public string GradeName { get; set; }
        public DateTime ExamDate { get; set; }
        public string ExamStartTime { get; set; }
        public int ExamDurationMinutes { get; set; }
        public DateTime? QuestionPaperUploadedOn { get; set; }
    }
}
