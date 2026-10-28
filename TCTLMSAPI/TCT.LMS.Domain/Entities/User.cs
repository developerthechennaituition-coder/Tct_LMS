using System.ComponentModel.DataAnnotations;

namespace TCT.LMS.Domain.Entities;

public class User : BaseEntity
{
    [Key]
    public Guid Id { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? UserCode { get; set; }
    public DateTime? JoiningDate { get; set; }
    public DateTime? LastWorkingDate { get; set; }
    public string? Email { get; set; }
    public string? PasswordHash { get; set; }
    public string? Phone { get; set; }
    public string? AlternatePhone { get; set; }
    public DateTime? DOB { get; set; }
    public string? Gender { get; set; }
    public Guid? DesignationId { get; set; }
    public bool? EmailConfirmed { get; set; } = false;
    public DateTime? LastLogin { get; set; } = null;
    public Guid? ManagerId { get; set; }
    public Guid? UserType { get; set; }
    public string? Location { get; set; }
    public string? FullName { get; set; }

    public void SetFullName()
    {
        FullName = $"{FirstName} {LastName}";
    }

    public bool IsSystemUser { get; set; } = false;
    public bool IsAdminUser { get; set; } = false;
    public string? Nickname { get; set; }
    public string? Theme { get; set; }
    public string? ChatTheme { get; set; }
    public bool? IsFavorite { get; set; }
    public string? LastActiveStatus { get; set; }
    public DateTime? LastActiveDate { get; set; }
    public bool? UnreadMessages { get; set; }
    public bool? IsArchived { get; set; }
    public bool? IsDelivered { get; set; }
    public List<Address>? Addresses { get; set; }
    public DateTime? LastLoggedIn { get; set; }

}
