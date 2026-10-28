using TCT.LMS.API.Controllers.Base;
using TCT.LMS.Application;
using TCT.LMS.Domain.Entities;

namespace TCT.LMS.API.Controllers;

public class UserRoleController : BaseAPIController<UserRole>
{
    public UserRoleController(IGenericService<UserRole> service) : base(service)
    {
    }
}
