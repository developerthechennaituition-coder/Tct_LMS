using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.Domain.Entities;

public class IndianTutorBankDetails : BaseEntity
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid TutorID { get; set; }

    [Required]
    [StringLength(50)]
    public string AccountNumber { get; set; }

    [Required]
    [StringLength(20)]
    public string IFSCCode { get; set; }

    [Required]
    [StringLength(100)]
    public string BankName { get; set; }

    [Required]
    [StringLength(100)]
    public string BranchName { get; set; }

    [StringLength(100)]
    public string UpiID { get; set; }
    [StringLength(100)]
    public string SwiftCode { get; set; }

    [StringLength(100)]
    public string IBANNumber { get; set; }
}
