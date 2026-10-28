using Microsoft.Extensions.DependencyInjection;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Domain.Enums;

namespace TCT.LMS.Application.Services;

public class CommunicationFactory : ICommunicationFactory
{
    private readonly IServiceProvider _serviceProvider;
    public CommunicationFactory(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }
    public ICommunicationServiceStrategy CreateStrategy(CommunicationType type)
    {
        return type switch
        {
            CommunicationType.Email => _serviceProvider.GetRequiredService<EmailServiceStrategy>(),
            CommunicationType.Sms => _serviceProvider.GetRequiredService<SmsServiceStrategy>(),
            _ => throw new ArgumentException("Invalid communication type")
        };
    }
}
