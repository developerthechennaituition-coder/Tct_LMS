using System.ComponentModel.DataAnnotations;

namespace TCT.LMS.Domain.Entities
{
    public class TutorPaymentApproval
    {
        [Key]
        public Guid Id { get; set; }
        public Guid TutorStudentAllocationId { get; set; }
        public Guid StudentId { get; set; }
        public Guid TutorId { get; set; }
        public Guid? SalesDetailsId { get; set; }
        public Guid SubjectId { get; set; }
        public string Grade { get; set; } = null!;
        public string Board { get; set; } = null!;
        public decimal RequestedPaymentAmount { get; set; }
        public decimal BasePaymentAmount { get; set; }
        public decimal TutorCurrentMaxPayment { get; set; }
        public int ApprovalStatus { get; set; }
        public Guid RequestedBy { get; set; }
        public DateTime RequestedDate { get; set; }
        public Guid? ApprovedBy { get; set; }
        public DateTime? ApprovedDate { get; set; }
        public string? ApprovalRemarks { get; set; }
        public string? RequestReason { get; set; }
        public int RequestType { get; set; }
        public decimal? ApprovedPaymentAmount { get; set; }
        public DateTime? EffectiveDate { get; set; }
        public Guid? PreviousTutorId { get; set; }
        public Guid? PreviousStatusId { get; set; }
        public bool IsActive { get; set; }
        // Tutor assignment rules that sent the request to the Super Admin (comma-separated
        // TutorAssignmentThresholdRules codes); null for an ordinary payment request.
        public string? AssignmentRuleCodes { get; set; }
    }

    public enum TutorPaymentRequestType
    {
        AssignmentOnly = 1,
        AssignmentWithPaymentChange = 2,
        ExistingAssignmentPaymentChange = 3,
        TutorRateChange = 4,
        // An assignment that needs Super Admin approval under a tutor assignment rule, with no payment change.
        AssignmentRuleApproval = 5
    }
}

