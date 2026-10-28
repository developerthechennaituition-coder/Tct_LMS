using TCT.LMS.API.Controllers.Base;
using TCT.LMS.Application;
using TCT.LMS.Domain.Entities;

namespace TCT.LMS.API.Controllers;

public class PermissionController : BaseAPIController<Permissions>
{
    public PermissionController(IGenericService<Permissions> service) : base(service)
    {
    }
}