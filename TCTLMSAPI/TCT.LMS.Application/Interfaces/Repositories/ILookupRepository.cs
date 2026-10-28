using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.DTOs.Lookup;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.Application.Interfaces.Repositories
{
    public interface ILookupRepository
    {
        Task<Response<Guid>> UpdateTypeGroup(TypeGroupDTO input);
    }
}
