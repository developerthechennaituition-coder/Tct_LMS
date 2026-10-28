using System.ComponentModel.DataAnnotations.Schema;
using TCT.LMS.Domain;

namespace TCT.LMS.DTOs.Address
{
    public class StudentElectronicAddressRequestDto : BaseEntity
    {
        public Guid? Id { get; set; }
        [ForeignKey("StudentId")]
        public Guid? StudentId { get; set; }
        public Guid? UserType { get; set; }
        public string? EmailAddress { get; set; }
        public string? MobileNumber { get; set; }
        public bool? IsPrimary { get; set; }
    }
}
