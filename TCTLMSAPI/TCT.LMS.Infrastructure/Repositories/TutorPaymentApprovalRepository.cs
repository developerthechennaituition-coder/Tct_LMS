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
    public class TutorPaymentApprovalRepository : GenericRepository<TutorPaymentApproval>, ITutorPaymentApprovalRepository
    {
        private readonly ApplicationDbContext _dbContext;
        public TutorPaymentApprovalRepository(ApplicationDbContext dbContext) : base(dbContext)
        {
            _dbContext = dbContext;
        } 
    }
}
