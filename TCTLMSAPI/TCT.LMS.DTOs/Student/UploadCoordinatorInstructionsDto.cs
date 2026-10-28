using Microsoft.AspNetCore.Http;

namespace TCT.LMS.DTOs.Student;

public class UploadCoordinatorInstructionsDto
{
    public Guid StudentId { get; set; }
    public IFormFile File { get; set; } = null!;
}
