using Microsoft.AspNetCore.Mvc;
using TCT.LMS.API.Controllers.Base;
using TCT.LMS.Application;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Sales;

namespace TCT.LMS.API.Controllers;

public class PaymentPercentageConfigurationViewController : BaseAPIController<PaymentPercentageConfigurationView>
{
    public PaymentPercentageConfigurationViewController(IGenericService<PaymentPercentageConfigurationView> service) : base(service)
    {
    }
}
