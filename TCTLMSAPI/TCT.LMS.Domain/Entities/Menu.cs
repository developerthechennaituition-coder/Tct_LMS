using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.Domain.Entities;

public class Menu : BaseEntity
{
    public int Id { get; set; }

    public string? Name { get; set; }

    public string? Description { get; set; }

    public bool IsMenu { get; set; }

    public bool IsParentMenu { get; set; }

    public int? ParentMenuId { get; set; }

    public string? Icon { get; set; }

    public string? Link { get; set; }

    public int SortOrder { get; set; }
}