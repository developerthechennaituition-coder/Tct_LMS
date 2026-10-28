using TCT.LMS.Application;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Data.Common;
using TCT.LMS.Domain.Entities;

namespace TCT.LMS.Infrastructure.Repositories;

public class RolePermissionRepository : GenericRepository<RolePermission>, IRolePermissionRepository
{
    public RolePermissionRepository(ApplicationDbContext dbContext) : base(dbContext)
    {

    }
}
