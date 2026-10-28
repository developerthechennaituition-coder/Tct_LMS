using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.Notes
{
    public class NotesDto
    {
        public Guid Id { get; set; }
        public string NoteText { get; set; }
        public string Title { get; set; }
        public Guid ReferenceTypeId { get; set; }
        public Guid UserId { get; set; }
        public Guid ReferenceId { get; set; }
        public Guid CreatedBy { get; set; }
        public DateTime CreatedDate { get; set; }
        public Guid? ModifiedBy { get; set; }
        public DateTime? ModifiedDate { get; set; }
        public bool IsActive { get; set; }
    }
}
