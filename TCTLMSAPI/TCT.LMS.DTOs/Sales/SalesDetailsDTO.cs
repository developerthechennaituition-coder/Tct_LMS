using Microsoft.AspNetCore.Http;

namespace TCT.LMS.DTOs.Sales;

public class SalesDetailsDTO
{
    public Guid SaleDetailsId { get; set; }
    public string StudentId { get; set; }
    public string StudentName { get; set; }
    public string TutorName { get; set; }
    public Guid CoordinatorId { get; set; }
    public string CoordinatorName { get; set; }
    public Guid SubjectId { get; set; }
    public string SubjectName { get; set; }
    public string GradeName { get; set; }
    public Guid? GradId { get; set; }
    public string BoardName { get; set; }
    public Guid? BoardId { get; set; }
    public Guid? TutorId { get; set; }
    public Guid? TutorUserId { get; set; }
    public DateTime EnrollmentDate { get; set; }
    public Guid Status { get; set; }
    public int? StatusTypeCode { get; set; }
    public string StatusTypeName { get; set; }
    public decimal TutorPayment { get; set; }
    public decimal PreviousTutorPayment { get; set; }
    public decimal RequestedTutorPayment { get; set; }
    public bool TutorPaymentApprovalRequired { get; set; }
    public decimal ParentPayment { get; set; }
    public string? SubjectCode { get; set; }
    public string? AuthorBookDetails { get; set; }
    //public Guid? PreviousBoardId { get; set; }
    //public string? PreviousMarks { get; set; }
    //public string? ExamSeries { get; set; }
    //public DateTime? CustomerConnectedDate { get; set; }
    //public string? AuthorBookDetails { get; set; }
    //public string? TutorPreference { get; set; }
    //public string? SubjectCode { get; set; }
    //public string? GenderPreference { get; set;     
    //public string? LevelOfDemonstration { get; set; }
    //public string? StudentCurrentLocationAndSchool { get; set; }
    //public string? ParentsInterestedLevel { get; set; }
    //public string? CallLogDuration { get; set; }
    public string? NoOfSessionPerWeek { get; set; }
    public DateTime? DemoDate { get; set; }
    public bool? IsPaidDemo { get; set; }
    public string? DemoTopic { get; set; }
    public IFormFile? CallLogImage { get; set; }
    public Guid StdUserId { get; set; }
    public Guid? SalesId { get; set; }
    public DateTime? OperationStartTime { get; set; }
    public string? Comments { get; set; }

}
