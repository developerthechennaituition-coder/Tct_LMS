using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Domain;

namespace TCT.LMS.DTOs.Invoice
{
    public class InvoiceQueryResult
    {
        [Key]
        public Guid? UserId { get; set; }
        public Guid? ScheduleId { get; set; }
        public Guid? StudentId { get; set; }
        public Guid? TutorId { get; set; }
        public string? StudentName { get; set; }
        public string? TutorName { get; set; }
        public string? ParentName { get; set; }
        public string? Grade { get; set; }
        public string? Board { get; set; }
        public string? Subject { get; set; }
        public int? Year { get; set; }
        public int? Month { get; set; }
        public string? MonthName { get; set; }
        public decimal? ParentPayment { get; set; }
        public int? NumberOfClasses { get; set; }
        public decimal? TotalParentPayment { get; set; }
        public int? PreviousMonthTotalClasses { get; set; }
        public int? PreviousMonthPendingClasses { get; set; }
        public string? PreviousMonthPendingClassesMonthYear { get; set; }
        public decimal? TotalInvoiceAmount { get; set; }
        public string? ScheduleType { get; set; }
    }
}
