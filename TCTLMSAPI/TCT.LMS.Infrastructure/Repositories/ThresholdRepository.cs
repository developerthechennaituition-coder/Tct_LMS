using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Application;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Data.Common;
using TCT.LMS.Domain.Entities;

namespace TCT.LMS.Infrastructure.Repositories
{
    public class ThresholdRepository : GenericRepository<Thresholds>, IThresholdRepository
    {
        public readonly ApplicationDbContext _dbContext;
        public ThresholdRepository(ApplicationDbContext dbContext) : base(dbContext)
        {
            _dbContext = dbContext;
        }
        public async Task<Thresholds?> GetThresholdByNameAsync(string thresholdName)
        {
            return await _dbContext.Thresholds
               .Where(t => t.IsActive && t.ThresholdName == thresholdName)
               .FirstOrDefaultAsync();
        }

        public async Task<List<Thresholds>> GetThresholdsByNameAsync(string thresholdName)
        {
            return await _dbContext.Thresholds
             .Where(t => t.IsActive && t.ThresholdName == thresholdName)
             .ToListAsync();
        }
    }
}
