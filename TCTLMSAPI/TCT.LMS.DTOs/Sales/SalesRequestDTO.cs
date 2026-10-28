using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations.Schema;
using TCT.LMS.Domain;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Address;
using TCT.LMS.DTOs.Student;

namespace TCT.LMS.DTOs.Sales;

public class SalesRequestDto : BaseEntity
{
    public Guid Id { get; set; }
    public Guid Ownership { get; set; }
    [ForeignKey("Student")]
    public Guid StudentId { get; set; }
    public Guid? BoardId { get; set; }
    public Guid? GradeId { get; set; }
    public Guid? PreviousBoardId { get; set; }
    public string? ExamSeries { get; set; }
    public string? PreviousMarks { get; set; }
    public DateTime? CustomerConnectedDate { get; set; }
    public string? SubjectCode { get; set; }
    public string? AuthorBookDetails { get; set; }
    public string? LevelOfDemonstration { get; set; }
    public string? TutorPreference { get; set; }
    public string? GenderPreference { get; set; }
    public string? ParentsInterestedLevel { get; set; }
    public string? StudentCurrentLocationAndSchool { get; set; }
    public string? NoOfSessionPerWeek { get; set; }
    public Guid? GradeGroupId { get; set; }
    public IList<IFormFile>? Files { get; set; }
    public StudentRequestDto? Student { get; set; }
    public List<SalesDetailsRequestDto>? SalesDetailRequest { get; set; }
}
