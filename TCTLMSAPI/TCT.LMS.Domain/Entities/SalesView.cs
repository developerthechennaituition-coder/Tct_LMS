using System.ComponentModel.DataAnnotations;

namespace TCT.LMS.Domain.Entities;

public class SalesView
{
    [Key]
    public Guid? SalesId { get; set; }
    public Guid? SalesDetailsId { get; set; }
    public Guid? StudentId { get; set; }
    public string? StudentName { get; set; }
    public string? ParentName { get; set; }
    public Guid? TutorId { get; set; }
    public string? TutorName { get; set; }
    public List<Guid> BoardIds { get; set; }
    public List<string> BoardNames { get; set; }
    public List<Guid> GradeIds { get; set; }
    public List<string> GradeNames { get; set; }
    public List<Guid> SubjectIds { get; set; }
    public List<string> SubjectNames { get; set; }
    public Guid? StudentAddressId { get; set; }
    public string? StudentStreet { get; set; }
    public string? StudentCity { get; set; }
    public string? StudentState { get; set; }
    public string? StudentZipcode { get; set; }
    public string? StudentCountry { get; set; }
    public Guid? TutorAddressId { get; set; }
    public string? TutorStreet { get; set; }
    public string? TutorCity { get; set; }
    public string? TutorState { get; set; }
    public string? TutorZipcode { get; set; }
    public string? TutorCountry { get; set; }
    public string? StudentElectronicAddress { get; set; }
    public string? TutorElectronicAddress { get; set; }
    public string? Ownership { get; set; }
    public string? Coordinator { get; set; }
    public string? ParentPayment { get; set; }
    public string? TutorPayment { get; set; }
    public StudentAddress? Address { get; set; }
    public StudentElectronicAddress? ElectronicAddress { get; set; }
}
