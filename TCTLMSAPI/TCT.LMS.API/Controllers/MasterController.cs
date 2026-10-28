using Microsoft.AspNetCore.Mvc;
using TCT.LMS.API.Controllers.Base;
using TCT.LMS.Application;
using TCT.LMS.Domain.Entities;

namespace TCT.LMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MasterController : BaseAPIController<TypeGroup>
{
    public MasterController(IGenericService<TypeGroup> service) : base(service)
    {
    }
}
