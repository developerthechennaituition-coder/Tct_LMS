using Microsoft.AspNetCore.Mvc;
using TCT.LMS.API.Controllers.Base;
using TCT.LMS.Application;
using TCT.LMS.Domain.Entities;

namespace TCT.LMS.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class TutorAddressController : BaseAPIController<TutorAddress>
{
    public TutorAddressController(IGenericService<TutorAddress> service) : base(service)
    {
    }
}