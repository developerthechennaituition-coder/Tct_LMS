using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Domain;

namespace TCT.LMS.Domain.Entities;
public class PaymentPercentageConfigurationView : BaseEntity
{
    public Guid Id { get; set; }

    // Foreign Keys
    public Guid Board { get; set; }
    public Guid Grade { get; set; }
    public Guid Subject { get; set; }

    public string BoardName { get; set; }
    public string GradeName { get; set; }
    public string SubjectName { get; set; }
    // Percentages and Discounts
    public int? TutorPercentage { get; set; }
    public int? TCTPercentage { get; set; }
    public int? TutorPercentageDiscount { get; set; }
    public int? TCTPercentageDiscount { get; set; }
}

