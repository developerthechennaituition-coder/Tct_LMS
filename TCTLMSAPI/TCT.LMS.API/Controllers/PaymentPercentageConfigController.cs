using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TCT.LMS.API.Controllers.Base;
using TCT.LMS.Application;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Sales;


namespace TCT.LMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PaymentPercentageConfigController : BaseAPIController<PaymentPercentageConfiguration>
{
    private readonly IPaymentPercentageService _paymentPercentageService;
    public PaymentPercentageConfigController(IGenericService<PaymentPercentageConfiguration> service, IPaymentPercentageService paymentPercentageService)
        : base(service)
    {
        _paymentPercentageService = paymentPercentageService;
    }

    [AllowAnonymous]
    [HttpGet("getPaymentPercentage")]
    public async Task<ActionResult<PaymentPercentageDto>> GetPaymentPercentageByBoardGradeSubject([FromQuery] PaymentPercentageDto paymentPercentageDto)
    {
        var entity = await _paymentPercentageService.GetPaymentPercentageAsync(paymentPercentageDto.BoardId.Value,
            paymentPercentageDto.GradeId.Value,
            paymentPercentageDto.SubjectId.Value, 
            paymentPercentageDto.TutorPayment);

        if (entity == null)
        {
            return NotFound();
        }

        return Ok(entity);
    }

}
