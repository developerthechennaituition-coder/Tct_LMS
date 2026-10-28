using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using TCT.LMS.API.Controllers.Base;
using TCT.LMS.Application;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Student;

namespace TCT.LMS.API.Controllers;

public class TCTBankDetailsController : BaseAPIController<TCTBankDetails>
{
    public readonly IStudentService _studentService;
    private readonly IGenericService<TCTBankDetails> _bankDetailsService;
    public TCTBankDetailsController(IGenericService<TCTBankDetails> service, IStudentService studentService) : base(service)
    {
        _bankDetailsService = service;
        _studentService = studentService;
    }

    [HttpPost("update/{id:guid}")]
    public async Task<IActionResult> UpdateByPost(Guid id, [FromBody] TCTBankDetails bankDetails)
    {
        if (id != bankDetails.Id)
            return BadRequest("The bank detail identifier does not match the route.");

        await _bankDetailsService.UpdateAsync(bankDetails);
        return NoContent();
    }

    [HttpPut("bankdetailsforpayment")]
    [HttpPost("bankdetailsforpayment")]
    [Authorize(Roles = "AccountsAdmin")]
    public async Task<IActionResult> BankDetailsForPaymentForStudent([FromBody] BankDetailsUpdateRequest request)
    {
        if (request.UserId == Guid.Empty || request.StudentId == Guid.Empty || request.BankDetailId == Guid.Empty)
        {
            return BadRequest("Invalid identifier provided");
        }

        var bankDetail = await _bankDetailsService.GetByIdAsync(request.BankDetailId);
        if (bankDetail is null)
        {
            return NotFound("The selected bank detail was not found.");
        }
        if (!bankDetail.IsActive)
        {
            return BadRequest("Inactive bank details cannot be mapped to a student.");
        }

        var result = await _studentService.BankDetailsForPaymentForStudent(request);
        return Ok(result);
    }
}
