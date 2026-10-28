using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.Domain.Entities;

public class StudentSelectionDto
{
    public Guid UserId { get; set; }
    public string UserCode { get; set; }
    public string StudentName { get; set; }
    public string Email { get; set; }
    public string ClassName { get; set; }
}
