using System.ComponentModel.DataAnnotations.Schema;
using TCT.LMS.Domain;

namespace TCT.LMS.DTOs.Address;

public class AddressRequestDto : BaseEntity
{
    public Guid? Id { get; set; }
    public Guid? UserId { get; set; }
    public string? Street { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? ZipCode { get; set; }
    public string? Country { get; set; }
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? AddressLine3 { get; set; }
    public bool? IsPrimary { get; set; }
}