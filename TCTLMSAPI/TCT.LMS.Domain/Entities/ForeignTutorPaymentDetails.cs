using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.Domain.Entities;

public class ForeignTutorPaymentDetails : BaseEntity
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid TutorID { get; set; }

    [Required]
    [StringLength(100)]
    public string PaymentIdentifier { get; set; }
}
