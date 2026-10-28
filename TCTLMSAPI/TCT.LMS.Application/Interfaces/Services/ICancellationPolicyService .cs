using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.DTOs.Schedule;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.Application.Interfaces.Services
{
    public interface ICancellationPolicyService
    {
        Task<Response<string>> ValidateTutorCancellationAsync(Guid salesDetailsId, CancellationToken cancellationToken);
    }
}
