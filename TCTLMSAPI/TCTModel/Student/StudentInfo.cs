using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCTModel.Student
{
    public class StudentInfo
    {
        public byte[]? FileData { get; set; }
        public byte[]? AudioFileData { get; set; }
        public string? AudioContentType { get; set; }
        public Guid Id { get; set; }
        public Guid? CoordinatorId { get; set; }
        public Guid? OperationId { get; set; }
        public string? Code { get; set; }
        public string StudentName { get; set; }
        public string ParentName { get; set; }
        public string CoordinatorName { get; set; }
        public string OperationName { get; set; }
        public DateTime? DOB { get; set; }
        public string? Gender { get; set; }
        public Guid BoardId { get; set; }
        public Guid GradeId { get; set; }
        public string? EmailAddress { get; set; }
        public string? MobileNumber { get; set; }
        public string? Grade { get; set; }
        public string? Board { get; set; }
        public string? Country { get; set; }
        public string? EnrolledCourse { get; set; }
        public string? EnrollmentDate { get; set; }
        public string? Status { get; set; }
        public Guid? UserId { get; set; }
        public DateTime CreatedDate { get; set; }
        public string FullName { get; set; }
        public Guid? SubjectId { get; set; }
        public Guid? SalesId { get; set; }
        public Guid? DetailsId { get; set; }
        public Guid? TctBankID { get; set; }
        public int? GSTPercentage { get; set; }
        public int? VATPercentage { get; set; }
        public string? Currency { get; set; }
        public string? ClientGST { get; set; }
        public string? ClientPAN { get; set; }
        public string? ClientGSTStateCode { get; set; }
        public string? ClientCountryCode { get; set; }
        public bool HasSchedule { get; set; }
    }
}
