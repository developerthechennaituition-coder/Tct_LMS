using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.DTOs.Schedule;

namespace TCT.LMS.DTOs.Dashboard
{
    public class AccountDashboardDto
    {
        public AccountsOverallSummaryDto? OverallSummary { get; set; }
    }

    public class AccountsOverallSummaryDto
    {
        public int TotalStudent { get; set; }
        public int TotalTutor { get; set; }
    }
}
    