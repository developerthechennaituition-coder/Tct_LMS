using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.Tutor
{
    public class TutorResponseDto : TutorDetailsRequestDto
    {
        public string DayOfWeek { get; set; }
        public Guid UserId { get; set; }            // u.Id
        public string FullName { get; set; }        // u.FullName
        public DateTime? JoiningDate { get; set; }   // u.JoiningDate
        public Guid TutorId { get; set; }           // t.Id
        public bool IsAvailable { get; set; }   // hardcoded 0 in SQL
    }
}
