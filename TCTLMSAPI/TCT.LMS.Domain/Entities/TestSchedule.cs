using System;

namespace TCT.LMS.Domain.Entities;

public class TestSchedule : BaseEntity
{
    public Guid TestScheduleId { get; set; }
    public Guid StudentId { get; set; }
    public Guid TutorId { get; set; }
    public Guid SubjectId { get; set; }
    public Guid BoardId { get; set; }
    public Guid GradeId { get; set; }
    public DateTime ExamDate { get; set; }
    public string? ExamStartTime { get; set; } // stored as "HH:mm"
    public int ExamDurationMinutes { get; set; } = 180;

    // The question paper file itself lives in Document/DocumentStorage (ReferenceId = TestScheduleId).
    // These fields track the upload event; re-uploading (Replace) just adds a newer Document row.
    public string? QuestionPaperNotes { get; set; }
    public Guid? QuestionPaperUploadedBy { get; set; }
    public DateTime? QuestionPaperUploadedOn { get; set; }
}
