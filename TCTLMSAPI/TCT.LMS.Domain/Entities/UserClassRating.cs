using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.Domain.Entities
{
    public class UserClassRating  
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid RaterId { get; set; }

        [Required]
        public Guid RatedUserId { get; set; }

        public Guid? ReferenceId { get; set; } // Class/session ID or any reference

        public string? Topic { get; set; }

        [Range(1, 5)]
        public int Rating { get; set; }

        public Guid? RatingTypeId { get; set; }

        public string? Feedback { get; set; }

        // Navigation Properties
        [ForeignKey(nameof(RaterId))]
        public virtual User Rater { get; set; }

        [ForeignKey(nameof(RatedUserId))]
        public virtual User RatedUser { get; set; }
        public DateTime RatedAt { get; set; }
    }
}
