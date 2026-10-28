using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.Tutor;

public class ContactResponseDto
{
    public Guid? TutorId { get; set; }
    public Guid? StudentId { get; set; }
    public Guid AdminUserId { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? FullName { get; set; }
    public string? UserCode { get; set; }
    public string? Role { get; set; }
}
