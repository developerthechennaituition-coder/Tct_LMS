using Microsoft.AspNetCore.Mvc;
using TCT.LMS.API.Controllers.Base;
using TCT.LMS.Application;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Domain.Entities;

namespace TCT.LMS.API.Controllers;

public class ForeignTutorPaymentDetailsController : BaseAPIController<ForeignTutorPaymentDetails>
{
    private readonly ITutorService _tutorService;
    public ForeignTutorPaymentDetailsController(IGenericService<ForeignTutorPaymentDetails> service, ITutorService tutorService) : base(service)
    {
        _tutorService = tutorService;
    }

    [HttpGet("GetPaymentDetailsByTutorId/{id}")]
    public async Task<IActionResult> GetPaymentDetailsByTutorId(Guid id)
    {
        var result = await _tutorService.GetPaymentDetailsByTutorId(id);
        if (result == null)
            return NotFound();

        return Ok(result);
    }
}