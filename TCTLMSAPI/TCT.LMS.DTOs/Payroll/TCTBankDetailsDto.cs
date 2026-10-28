using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.Payroll;

public class TCTBankDetailsDto
{
    public Guid? Id { get; set; }
    public string? AccountNumber { get; set; }
    public string? IFSCCode { get; set; }
    public string? BankName { get; set; }
    public string? BranchName { get; set; }
    public string? UpiID { get; set; }
}
