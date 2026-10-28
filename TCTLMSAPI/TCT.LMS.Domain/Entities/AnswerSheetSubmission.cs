using System;

namespace TCT.LMS.Domain.Entities;

public class AnswerSheetSubmission : BaseEntity
{
    public Guid AnswerSheetSubmissionId { get; set; }
    public Guid TestScheduleId { get; set; }
    public Guid StudentId { get; set; }

    // The answer sheet file itself lives in Document/DocumentStorage (ReferenceId = AnswerSheetSubmissionId).
    public DateTime SubmittedOn { get; set; }

    // Evaluation — must be completed within 1 day of SubmittedOn.
    public string EvaluationStatus { get; set; } = "Pending"; // Pending | Evaluated
    public decimal? MarksObtained { get; set; }
    public decimal? MaxMarks { get; set; }
    public string? Feedback { get; set; }
    public Guid? EvaluatedBy { get; set; }
    public DateTime? EvaluatedOn { get; set; }
}
