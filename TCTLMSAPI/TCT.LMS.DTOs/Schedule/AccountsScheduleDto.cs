using System;
using System.ComponentModel.DataAnnotations;

namespace TCT.LMS.DTOs.Schedule
{
    public class AccountsScheduleDto
    {
        //[Key]
        public Guid StudentId { get; set; }
        public Guid UserId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string TutorName { get; set; } = string.Empty;
        public string ParentName { get; set; } = string.Empty;
        public string Grade { get; set; } = string.Empty;
        public string Board { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public int Year { get; set; }
        public int Month { get; set; }
        public string MonthName { get; set; } = string.Empty;
        public decimal ParentPayment { get; set; }
        public int? NumberOfClasses { get; set; }
        public decimal TotalParentPayment { get; set; }
        public decimal AgreedFeesPerHour { get; set; }
        public string ScheduleType { get; set; } = string.Empty;
        public string? InvoiceNumber { get; set; } = string.Empty;
        public decimal TotalInvoiceAmount { get; set; } = 0;
        public decimal TotalHours { get; set; }
        public decimal TutorHours { get; set; }
        public decimal StudentHours { get; set; }
        public DateTime? ScheduleDate { get; set; }
        public DateTime? StartTime { get; set; }
        public DateTime? EndTime { get; set; }
        public DateTime? StudentStartTime { get; set; }
        public DateTime? StudentEndTime { get; set; }
        public DateTime? TutorStartTime { get; set; }
        public DateTime? TutorEndTime { get; set; }
        public DateTime? OperationStartTime { get; set; }
        public DateTime? OperationEndTime { get; set; }
        public Guid ScheduleDetailsId { get; set; }
        public Guid ScheduleId { get; set; }
    }
}
