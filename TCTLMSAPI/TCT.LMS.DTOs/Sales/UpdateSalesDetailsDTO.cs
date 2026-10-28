using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.Sales
{
    public class UpdateSalesDetailsDTO
    {
        public Guid SalesId { get; set; }
        public Guid SaleseDetailsId { get; set; }
        public Guid UserId { get; set; }
        public Guid TutorId { get; set; }
        public Guid StatusId { get; set; }
        public decimal TutorPayment { get; set; }
        public int Status { get; set; }
        public DateTime? FollowUpDate { get; set; }
        public string? NoteText { get; set; }
        public Guid? DropoutReasonTypeId { get; set; }
    }

    public class SalesDetailsUpdateResponsDto
    {
        public Guid SalesId { get; set; }
        public Guid SaleseDetailsId { get; set; }
        public Guid AllocationId { get; set; }
        public decimal PreviousTutorPayment { get; set; }
        public decimal RequestedTutorPayment { get; set; }
        public bool TutorPaymentApprovalRequired { get; set; }
        public Guid? TutorPaymentApprovalId { get; set; }
        public int? TutorPaymentRequestType { get; set; }
    }
}
