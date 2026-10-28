using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.Schedule
{
    public class CancellationResult
    {
        public bool IsAllowed { get; set; }
        public string Message { get; set; }
        public int StatusCode { get; set; }   // 0 = OK, 1 = Free, 2 = Penalty
        public decimal PenaltyAmount { get; set; }
        public int TotalCalss { get; set; }
        public int CancelCount { get; set; }
    }
}
