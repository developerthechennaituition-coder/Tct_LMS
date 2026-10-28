using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.Domain.Entities
{
    public class TutorStudentAllocationHistory
    {
        [Key]
        public Guid HistoryId { get; set; } = Guid.NewGuid();
        public Guid AllocationId { get; set; }
        public int PreviousStatus { get; set; }
        public int NewStatus { get; set; }
        public string ActionTakenBy { get; set; }
        public DateTime ActionEffectiveDate { get; set; }
        public string Notes { get; set; }
        public Guid CreatedBy { get; set; }
        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

        public TutorStudentAllocations Allocation { get; set; }
    }
}
