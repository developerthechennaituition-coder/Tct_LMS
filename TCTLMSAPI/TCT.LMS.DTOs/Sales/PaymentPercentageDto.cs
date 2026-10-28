using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.Sales
{
    public class PaymentPercentageDto
    {
        public Guid? BoardId { get; set; }
        public Guid? GradeId { get; set; }
        public Guid? SubjectId { get; set; }
        public int? TCTPercentage { get; set; }
        public int? TutorPercentage { get; set; }
        public decimal TutorPayment { get; set;}
    }
}
