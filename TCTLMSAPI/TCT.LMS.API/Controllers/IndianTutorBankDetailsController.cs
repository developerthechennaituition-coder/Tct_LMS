using Microsoft.AspNetCore.Mvc;
using TCT.LMS.API.Controllers.Base;
using TCT.LMS.Application;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Domain.Entities;

namespace TCT.LMS.API.Controllers;

public class IndianTutorBankDetailsController : BaseAPIController<IndianTutorBankDetails>
{
    private readonly ITutorService _tutorService;
    public IndianTutorBankDetailsController(IGenericService<IndianTutorBankDetails> service, ITutorService tutorService) : base(service)
    {
        _tutorService = tutorService;
    }

    [HttpGet("GetByTutorId/{id}")]
    public async Task<IActionResult> GetBankDetailsByTutorId(Guid id)
    {
        var result = await _tutorService.GetBankDetailsByTutorId(id);
        if (result == null)
            return NotFound();

        return Ok(result);
    }
}