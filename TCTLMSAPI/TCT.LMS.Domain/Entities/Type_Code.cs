using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TCT.LMS.Domain.Entities;

public class Type_Code : BaseEntity
{
    [Key]
    public Guid Id { get; set; }

    [ForeignKey("TypeGroupId")]
    public Guid? TypeGroupId { get; set; }
    public bool IsSystemDefault { get; set; }

    public int TypeCodeValue { get; set; }

    public string? TypeCodeName { get; set; }

    public string? TypeCodeDescription { get; set; }
    public string? DisplayColor { get; set; }

    public Guid? MappingId { get; set; }
}
