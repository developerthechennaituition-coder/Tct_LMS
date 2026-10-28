using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using TCT.LMS.Domain;
using TCT.LMS.Domain.Entities;

namespace TheChennaiTuitionQA.Models
{
    public class UserAvailability : BaseEntity
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid UserId { get; set; }

        [Required]
        public Guid UserType { get; set; }

        [Required]
        [MaxLength(10)]
        public string DayOfWeek { get; set; }

        [Required]
        public DateTime StartTime { get; set; }

        [Required]
        public DateTime EndTime { get; set; }

        [MaxLength(250)]
        public string? TimeZone { get; set; }

        public bool IsRecurring { get; set; } = false;
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }

    }
}
