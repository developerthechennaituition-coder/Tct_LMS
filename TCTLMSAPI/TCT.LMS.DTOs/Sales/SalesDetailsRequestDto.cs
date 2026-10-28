using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Domain;
using TCT.LMS.DTOs.Tutor;

namespace TCT.LMS.DTOs.Sales;

public class SalesDetailsRequestDto : BaseEntity
{
    public Guid Id { get; set; }
    public Guid? SalesDetailsId { get; set; }
    [ForeignKey("SalesId")]
    public Guid SalesId { get; set; }
    public Guid Coordinator { get; set; }
    public Guid CoordinatorAdminId { get; set; }
    public Guid SubjectId { get; set; }
    public decimal? ParentPayment { get; set; } = 0;
    public Guid? TutorId { get; set; }
    public Guid? StatusId{ get; set; }
    public decimal TutorPayment { get; set; }
    public Guid? StudentId {  get; set; }   
    public Guid? UserId {  get; set; }
    public Guid? FromUserId {  get; set; }
    public Guid? ToUserId {  get; set; }
    public bool TutorApprovedStatus {  get; set; }
    public DateTime? StartDate {  get; set; }
    public string? PreviousMarks { get; set; }
    public DateTime? DemoDate { get; set; }
    public bool? IsPaidDemo { get; set; }
    public string? DemoTopic { get; set; }
    public string? NoOfSessionPerWeek { get; set; }
    public string? SubjectCode { get; set; }
    public string? AuthorBookDetails { get; set; }
}

public class EnrolledCourse
{
    public Guid SubjectId { get; set; }
    public string SubjectName { get; set; }
    public string? Grade { get; set; }
    public string? Board { get; set; }
    public string? TutorName { get; set; }
    public string? StudentName { get; set; }
    public Guid SalesId { get; set; }
    public Guid SalesDetailsId { get; set; }
    public Guid Id { get; set; }
    public Guid? TutorId { get; set; }
    public Guid? StatusId { get; set; }
    public Guid? StudentId { get; set; }
    public Guid SaleDetailsId { get; set; }
    public decimal ParentPayment { get; set; }
    public string? StatusName { get; set; }
    public string? CoordinatorName { get; set; }
    public DateTime CreatedDate { get; set; }
    public bool IsActive { get; set; }
    public Guid? CoordinatorId { get; set; }
    public Guid? NotificationId { get; set; }
    public Guid? CreatedBy { get; set; }
    public Guid? FromUserid { get; set; }
    public Guid? ToUserid { get; set; }
    public string? Message { get; set; }
    public string? Comment { get; set; }
    public string? DisplayColor { get; set; }
    public int? TypeCodeValue { get; set; }
    public bool IsClassScheduled { get; set; } = false;
    public Guid? ScheduleId { get; set; }
    public int? ShortCode { get; set; }
    public Guid? ModifiedBy { get; set; }
    public string? ModifiedByUser { get; set; }
    public DateTime? ModifiedDate { get; set; }
    public string? TutorEmail { get; set; }
    public string? TutorPhone { get; set; }
    public Guid StdUserId { get; set; }
    public string? NoOfSessionPerWeek { get; set; }
    public Guid? TutorUserId { get; set; }
    public string? SubjectCode { get; set; }
    public string? AuthorBookDetails { get; set; }
}

