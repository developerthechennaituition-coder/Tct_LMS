using Microsoft.AspNetCore.Mvc;
using TCT.LMS.API.Controllers.Base;
using TCT.LMS.Application;
using TCT.LMS.Domain.Entities;

namespace TCT.LMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ThresholdController : BaseAPIController<Thresholds>
{
    public ThresholdController(IGenericService<Thresholds> service) : base(service)
    {
    }
}
