using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Sales;

namespace TCT.LMS.Application.Interfaces.Services
{
    public interface IPaymentPercentageService
    {
        Task<PaymentPercentageDto> GetPaymentPercentageAsync(Guid boardId, Guid gradeId, Guid subjectId, decimal parentPayment);
    }
}
