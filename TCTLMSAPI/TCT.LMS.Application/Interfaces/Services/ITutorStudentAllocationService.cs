using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.DTOs.TutorStudentAllocation;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.Application.Interfaces.Services
{
    public interface ITutorStudentAllocationService
    {
        Task<Response<Guid>> AssignTutorAsync(TutorStudentAllocationRequestDto allocation);
        Task<Response<bool>> UpdateTutorAssignmentAsync(TutorStudentAllocationRequestDto allocation);
        Task<Response<bool>> DisableAllocationAsync(Guid allocationId, bool isActive);
    }
}
