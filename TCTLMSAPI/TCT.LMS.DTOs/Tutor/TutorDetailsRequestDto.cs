namespace TCT.LMS.DTOs.Tutor;

public class TutorDetailsRequestDto
{
    public Guid TutorDetailsId { get; set; }
    public Guid BoardId { get; set; }
    public Guid GradeId { get; set; }
    public Guid SubjectId { get; set; }
}
