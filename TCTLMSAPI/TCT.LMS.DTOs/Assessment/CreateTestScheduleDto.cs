using System.ComponentModel.DataAnnotations;

namespace TCT.LMS.DTOs.Assessment;

public class CreateTestScheduleDto
{
    public Guid ScheduleId { get; set; }
    public DateTime ExamDate { get; set; }
    [Required, RegularExpression(@"^([01]\d|2[0-3]):[0-5]\d$")]
    public string ExamStartTime { get; set; } = "";
    [Range(1, 480)]
    public int ExamDurationMinutes { get; set; } = 60;
}

public class AssessmentScheduleOptionDto
{
    public Guid ScheduleId { get; set; }
    public Guid StudentId { get; set; }
    public Guid TutorId { get; set; }
    public Guid SubjectId { get; set; }
    public Guid BoardId { get; set; }
    public Guid GradeId { get; set; }
    public string StudentName { get; set; } = "";
    public string TutorName { get; set; } = "";
    public string SubjectName { get; set; } = "";
    public string BoardName { get; set; } = "";
    public string GradeName { get; set; } = "";
}
