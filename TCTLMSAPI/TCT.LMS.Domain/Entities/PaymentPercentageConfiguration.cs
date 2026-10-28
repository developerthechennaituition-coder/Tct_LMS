using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.Domain.Entities;

public class PaymentPercentageConfiguration : BaseEntity
{
    public Guid Id { get; set; }

    // Foreign Keys
    public Guid Board { get; set; }
    public Guid Grade { get; set; }
    public Guid Subject { get; set; }

    // Percentages and Discounts
    public int? TutorPercentage { get; set; }
    public int? TCTPercentage { get; set; }
    public int? TutorPercentageDiscount { get; set; }
    public int? TCTPercentageDiscount { get; set; }
}
