using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.Domain.Entities;

public class StudentSelectionLoginRequestDto
{
    public Guid UserId { get; set; }

    /// <summary>
    /// The email used in the initial login step. Must match the selected student's email.
    /// Prevents arbitrary UserId injection — caller must know the email that triggered
    /// the multi-student selection flow.
    /// </summary>
    public string LoginEmail { get; set; } = string.Empty;
}
