using System.ComponentModel.DataAnnotations;
using TCT.LMS.Domain.Authentication;

namespace TCT.LMS.Domain.Entities;

public class UserProfile : BaseEntity
{
    [Key]
    public Guid UserId { get; set; }
    public string FirstName { get; set; } = null!;
    public string LastName { get; set; } = null!;
    public string UserCode { get; set; } = null!;
    public DateTime? JoiningDate { get; set; }
    public DateTime? LastWorkingDate { get; set; }
    public string Email { get; set; } = null!;
    public string Phone { get; set; } = string.Empty;
    public Guid? Designation { get; set; }

    #region Status
    public void ActivateUser(bool isActivate)
    {
        EmailConfirmed = isActivate;
        LastWorkingDate = !isActivate ? DateTime.Now : null;
    }    

    public bool EmailConfirmed { get; set; } = false;
    public bool IsActive { get; set; }

    #endregion
    public string UserProfileImage { get; set; } = string.Empty;  
    public DateTime? LastLogin { get; set; } = null;

    public Guid? ManagerId { get; set; }
    public string Location { get; set; } = string.Empty;   
    //public Address Address { get; set; } = new();
    public string DateFormat { get; set; } = string.Empty;
    public string FullName
    {
        get
        {
            string returnValue = $"{FirstName} {LastName}";
            if (!string.IsNullOrWhiteSpace(UserCode))
                returnValue = $"{returnValue} - {UserCode}";
            return returnValue;
        }
    }

    public string FullNameWithoutCode { get { return $"{FirstName} {LastName}"; } }

    public string RoleNames { get; set; } = string.Empty;

    //public List<Guid> RoleIds { get; set; } = new();

    //public Permissions Permission { get; set; } = Permissions.None;

    //public bool IsSystemUser
    //{
    //    get
    //    {
    //        if ((Permission & Permissions.Admin) != 0) return false;
    //        if ((Permission & Permissions.MaintainanceAdmin) != 0) return true;

    //        return false;
    //    }
    //}

    public string ManagerName { get; set; } = string.Empty;

    public string DesignationName { get; set; } = string.Empty;
}
