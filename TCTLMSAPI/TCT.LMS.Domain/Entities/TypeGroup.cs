using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TCT.LMS.Domain.Entities;

public class TypeGroup : BaseEntity
{
    [Key]
    public Guid Id { get; set; }

    public string? TypeGroupName { get; set; }

    public string? TypeGroupDescription { get; set; }
       
    public int TypeGroupCode { get; set; }
   // public virtual ICollection<Type_Code>? TypeCodes { get; set; }
}
