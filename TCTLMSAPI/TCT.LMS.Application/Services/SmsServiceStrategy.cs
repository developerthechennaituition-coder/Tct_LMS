using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Application.Interfaces.Services;

namespace TCT.LMS.Application.Services;

public class SmsServiceStrategy : ICommunicationServiceStrategy
{
    public Task<string> SendMessageAsync(MailMessage message)
    {
        throw new NotImplementedException();
    }
}
