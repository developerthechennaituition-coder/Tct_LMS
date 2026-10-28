using System.ComponentModel.DataAnnotations;
using TCT.LMS.Domain;

namespace TCT.LMS.DTOs.Tutor;

public class TutorBankAndPaymentDetailsDto : BaseEntity
{
    public Guid Id { get; set; }
    public Guid TutorID { get; set; }
    public string? AccountNumber { get; set; }
    public string? IFSCCode { get; set; }
    public string? BankName { get; set; }
    public string? BranchName { get; set; }
    public string? UpiID { get; set; }
    public string? PaymentIdentifier { get; set; }
    public string SwiftCode { get; set; }
    public string IBANNumber { get; set; }
}
