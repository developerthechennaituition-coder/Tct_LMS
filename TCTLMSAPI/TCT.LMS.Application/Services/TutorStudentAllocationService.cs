using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.DTOs.TutorStudentAllocation;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.Application.Services
{
    public class TutorStudentAllocationService : ITutorStudentAllocationService
    {
        public Task<Response<Guid>> AssignTutorAsync(TutorStudentAllocationRequestDto allocation)
        {
            throw new NotImplementedException();
        }

        public Task<Response<bool>> DisableAllocationAsync(Guid allocationId, bool isActive)
        {
            throw new NotImplementedException();
        }

        public Task<Response<bool>> UpdateTutorAssignmentAsync(TutorStudentAllocationRequestDto allocation)
        {
            throw new NotImplementedException();
        }
    }
}
