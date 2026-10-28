using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Domain;

namespace TCT.LMS.DTOs.Sales
{
    public class SalesDetailsMinimalRequestDto : BaseEntity
    {
        public Guid Id { get; set; }

        [ForeignKey("SalesId")]
        public Guid SalesId { get; set; }
        public Guid Coordinator { get; set; }
        public Guid SubjectId { get; set; }
        public decimal ParentPayment { get; set; }
        public int? NoOfSessionInWeek { get; set; }
    }
}
