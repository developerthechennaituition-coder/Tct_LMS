using System.ComponentModel.DataAnnotations;

namespace TCT.LMS.Domain.Entities
{
    public sealed class UserActivity
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid UserId { get; set; }

        [Required]
        public DateTime LoggedIn { get; set; }

        public DateTime? LoggedOut { get; set; }
    }
}
