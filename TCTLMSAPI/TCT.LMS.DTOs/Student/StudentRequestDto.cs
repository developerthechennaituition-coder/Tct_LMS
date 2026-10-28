using Microsoft.AspNetCore.Http;
using TCT.LMS.Domain;
using TCT.LMS.DTOs.Address;

namespace TCT.LMS.DTOs.Student;

public class StudentRequestDto : BaseEntity
{
    public string? FileName { get; set; }
    public byte[]? FileData { get; set; }
    public Guid? Id { get; set; }
    public Guid? UserId { get; set; }   
    public string? Code { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? ParentName { get; set; }
    public Guid? BoardId { get; set; }
    public Guid? GradeId { get; set; }
    public Guid? GenderId { get; set; }
    public string? EmailAddress { get; set; }
    public string? MobileNumber { get; set; }
    public string? BoardName { get; set; }
    public string? GradeName { get; set; }
    public StudentAddressRequestDto? StudentAddress { get; set; }
    public List<StudentAddressRequestDto>? StudentAddresses { get; set; }
    public string? AlternatePhone { get; set; }
    public string? Gender { get; set; }
    public DateTime? DOB { get;set; }
    public Guid? Ownership { get; set; }
    public Guid? PreviousBoardId { get; set; }
    public string? PreviousMarks { get; set; }
    public string? ExamSeries { get; set; }
    public DateTime? CustomerConnectedDate { get; set; }
    public string? LevelOfDemonstration { get; set; }
    public string? TutorPreference { get; set; }
    public string? GenderPreference { get; set; }
    public string? ParentsInterestedLevel { get; set; }
    public string? StudentCurrentLocationAndSchool { get; set; }
    public string? GeneratedPassword { get; set; }
}
