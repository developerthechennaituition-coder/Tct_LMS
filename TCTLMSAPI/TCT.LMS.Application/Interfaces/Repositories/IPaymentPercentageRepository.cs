using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.Application.Interfaces.Repositories
{
    public interface IPaymentPercentageRepository
    {
        Task<Domain.Entities.PaymentPercentageConfiguration> GetPaymentPercentageAsync(Guid boardId, Guid gradeId, Guid subjectId);
    }
}
