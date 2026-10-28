using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TCT.LMS.Domain.Entities;

public class Sales : BaseEntity
{
    [Key]
    public Guid Id { get; set; }
    public Guid? Ownership { get; set; }
    [ForeignKey("Student")]
    public Guid? StudentId { get; set; }
    public Guid? BoardId { get; set; }
    public Guid? BoardDuringRegistration { get; set; }
    public Guid? GradeDuringRegistration { get; set; }
    public Guid? GradeId { get; set; }
    public Guid? TCTBankId { get; set; }
    public Guid? PreviousBoardId { get; set; }
    public string? PreviousMarks { get; set; }
    public string? ExamSeries { get; set; }
    public DateTime? CustomerConnectedDate { get; set; }
    public string? LevelOfDemonstration { get; set; }
    public string? TutorPreference { get; set; }
    public string? GenderPreference { get; set; }
    public string? ParentsInterestedLevel { get; set; }
    public string? StudentCurrentLocationAndSchool { get; set; }
    public Guid? GradeGroupId { get; set; }
    public int? GSTPercentage { get; set; }
    public int? VATPercentage { get; set; }
    public string? Currency { get; set; }
    public string? ClientGST { get; set; }
    public string? ClientPAN { get; set; }
    public string? ClientGSTStateCode { get; set; }
    public string? ClientCountryCode { get; set; }

    public DateTime? ClassActualDate { get;set; }
    public Student Student { get; set; }
    public List<SalesDetails> SalesDetails { get; set; }
}
