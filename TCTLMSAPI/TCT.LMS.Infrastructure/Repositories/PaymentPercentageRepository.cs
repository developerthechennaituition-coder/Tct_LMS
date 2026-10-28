using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Data.Common;
using TCT.LMS.Domain.Entities;

namespace TCT.LMS.Infrastructure.Repositories
{
    public class PaymentPercentageRepository : GenericRepository<PaymentPercentageConfiguration>, IPaymentPercentageRepository
    {
        private readonly ApplicationDbContext _dbContext;
        public PaymentPercentageRepository(ApplicationDbContext dbContext) : base(dbContext)
        {
            _dbContext = dbContext;
        }
        public async Task<Domain.Entities.PaymentPercentageConfiguration> GetPaymentPercentageAsync(Guid boardId, Guid gradeId, Guid subjectId)
        {

            var result = await _dbContext.PaymentPercentageConfiguration
                .Where(x => x.Board == boardId && x.Grade == gradeId && x.Subject == subjectId).FirstOrDefaultAsync();
            return result;
        }
    }
}
