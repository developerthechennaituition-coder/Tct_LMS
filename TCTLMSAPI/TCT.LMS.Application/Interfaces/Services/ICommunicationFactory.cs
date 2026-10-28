using TCT.LMS.Domain.Enums;

namespace TCT.LMS.Application.Interfaces.Services;

public interface ICommunicationFactory
{
    public ICommunicationServiceStrategy CreateStrategy(CommunicationType type);
}
