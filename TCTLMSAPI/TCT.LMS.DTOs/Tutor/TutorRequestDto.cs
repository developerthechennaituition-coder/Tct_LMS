using TCT.LMS.Domain;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Address;

namespace TCT.LMS.DTOs.Tutor;

public class TutorRequestDto : BaseEntity
{
    public Guid? TutorId { get; set; }
    public Guid? UserId { get; set; }
    public Guid Id { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? UserCode { get; set; }
    public DateTime? JoiningDate { get; set; }
    public DateTime? LastWorkingDate { get; set; }
    public string? Email { get; set; }
    public string? PasswordHash { get; set; }
    public string? GeneratedPassword { get; set; }
    public string? Phone { get; set; }
    public string? AlternatePhone { get; set; }
    public DateTime? DOB { get; set; }
    public string? Gender { get; set; }
    public Guid? DesignationId { get; set; }
    public int? RoleId { get; set; }
    public bool? EmailConfirmed { get; set; } = false;
    public DateTime? LastLogin { get; set; } = null;
    public Guid? ManagerId { get; set; }
    public Guid? UserType { get; set; }
    public string? Location { get; set; }
    public string? FullName { get; set; }

    private string _fullName; // field
    public string? UserFullName
    {
        get { return _fullName; }
        set { _fullName = $"{FirstName} {LastName}"; }
    }

    public bool IsSystemUser { get; set; } = false;
    public bool IsAdminUser { get; set; } = false;
    public AddressRequestDto? Address { get; set; }
    public string? DesignationName { get; set; }
    public byte[]? FileData { get; set; }
    public Guid CreatedBy { get; set; }
    public string? Role { get; set; }
    public Guid? ScheduleId { get; set; }
    public Guid? ScheduleDetailsId { get; set; }
    public List<TutorDetails>? TutorDetails { get; set; }    
      
}


public class TutorCourseDetailsDto
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public Guid LoggedInUserId { get; set; }
    public Guid TutorId { get; set; }
    public Guid BoardId { get; set; }
    public string? BoardName { get; set; }
    public Guid GradeId { get; set; }
    public string? GradeName { get; set; }
    public Guid? SubjectId { get; set; }
    public List<Guid> SubjectIds { get; set; }
    public string? SubjectName { get; set; }
    public string? Mode { get; set; }
    public decimal? TutorPayment { get; set; }
    public int? StudentCount { get; set; } 
}

public class TutorSkillsetDto
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public Guid BoardId { get; set; }
    public string? BoardName { get; set; }
    public Guid GradeId { get; set; }
    public string? GradeName { get; set; }
    public object SubjectIds { get; set; }
    public string? SubjectName { get; set; }
}
public class TutorResponsesDto
{
    public Guid? TutorId { get; set; }
    public Guid? UserId { get; set; }
    public string? TutorName { get; set; }
    public string? Email { get; set; }
    public Guid BoardId { get; set; }
    public string? BoardName { get; set; }
    public Guid GradeId { get; set; }
    public string? GradeName { get; set; }
    public Guid SubjectId { get; set; }
    public Guid SubjectIDAll { get; set; }
    public string? SubjectName { get; set; }
    public string? EngagementLevel { get; set; }
    public double? Rating { get; set; }
    public double? DropOutRatio { get; set; }
    public double? CancelationRatio { get; set; }
    public decimal? TutorPayment { get; set; }
    public double EngagmentRatio { get; set; }
    public Guid? GradeGroupId { get; set; }
    public decimal? MinPayment { get; set; }
    public decimal? MaxPayment { get; set; }

}
