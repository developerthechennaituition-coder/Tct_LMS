using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Sales;
using TCT.LMS.DTOs.TutorStudentAllocation;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.Application.Interfaces.Repositories;

public interface ITutorStudentAllocationRepository : IGenericRepository<TutorStudentAllocations>
{
    Task<Response<Guid>> AssignTutorAsync(TutorStudentAllocationRequestDto allocation);
    Task<Response<bool>> UpdateTutorAssignmentAsync(TutorStudentAllocationRequestDto allocation);
    Task<Response<bool>> DisableAllocationAsync(Guid allocationId, bool isActive);
}
