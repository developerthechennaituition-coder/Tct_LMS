using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.Tutor
{
    public class UpdateTutorPaymentDto
    {
        public Guid Id { get; set; }
        public decimal Payment { get; set; }
        public Guid UserId { get; set; }
        public DateTime? EffectiveDate { get; set; }
        public string? Reason { get; set; }
    }

    public class TutorPaymentDecisionDto
    {
        public Guid ApprovalId { get; set; }
        public Guid UserId { get; set; }
        public bool Approved { get; set; }
        public decimal? ApprovedAmount { get; set; }
        public string Comment { get; set; } = string.Empty;
    }
}
