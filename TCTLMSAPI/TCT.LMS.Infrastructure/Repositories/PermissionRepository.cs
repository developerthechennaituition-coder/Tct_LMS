using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Data.Common;
using TCT.LMS.Domain.Entities;

namespace TCT.LMS.Infrastructure.Repositories
{
    public class PermissionRepository : GenericRepository<Permissions>, IPermissionRepository
    {
        public PermissionRepository(ApplicationDbContext dbContext) : base(dbContext)
        {

        }
    }
}
