using TCT.LMS.API.Controllers.Base;
using TCT.LMS.Application;
using TCT.LMS.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace TCT.LMS.API.Controllers;

[Route("api/[controller]")]
public class RoleController : BaseAPIController<Roles>
{
    public RoleController(IGenericService<Roles> service) : base(service)
    {
    }
}
