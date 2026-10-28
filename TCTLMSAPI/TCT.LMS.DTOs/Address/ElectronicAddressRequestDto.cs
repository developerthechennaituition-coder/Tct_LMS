using System.ComponentModel.DataAnnotations.Schema;
using TCT.LMS.Domain;

namespace TCT.LMS.DTOs.Address;

public class ElectronicAddressRequestDto : BaseEntity
{
    public Guid? Id { get; set; }
    [ForeignKey("User")]
    public Guid? UserId { get; set; }
    public Guid? UserType { get; set; }
    public string? EmailAddress { get; set; }
    public string? MobileNumber { get; set; }
    public bool? IsPrimary { get; set; }
}