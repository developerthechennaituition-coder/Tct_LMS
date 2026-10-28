using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.DTOs.User;

namespace TCT.LMS.Application.Interfaces.Services
{
    public interface ICurrentUserService
    {
        CurrentUser GetUser();
    }
}
