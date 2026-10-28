using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Sales;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.Application.Interfaces.Services;

public interface ISalesService
{
    Task<IEnumerable<Sales>> GetAllSales(bool hideInActive = false, bool hideIsPrimary = false);
    Task<SalesRequestDto> GetSalesById(Guid id);
    Task<SalesRequestDto> CreateSales(SalesRequestDto salesModel);
    Task<SalesMinimalRequestDTO> CreateSalesWithMinimalDetails(SalesMinimalRequestDTO salesModel);
    Task UpdateSales(Guid id, SalesRequestDto salesDto);
    Task DeleteSales(Guid id); 
    Task<Response<Guid>> EnrollCouse(SalesDetailsRequestDto input);
    DTOs.Wrappers.Response<bool> DeleteCourse(Guid detailsId);
    Task<Response<SalesDetailsUpdateResponsDto>> UpdateSalesDetailsStatus(UpdateSalesDetailsDTO salesDetailsDto);
    Task<bool> UpdateSalesDetailsTutorAssignedStatus(SalesDetailsRequestDto salesDetailsDto);
    Task<IEnumerable<EnrolledCourse>> GetCoursesByCoordinatorId(Guid studentId, Guid coordinatorId);
    Task<List<EnrolledCourse>> GetSubjectList(Guid studentId, Guid coordinatorId);
    Response<SalesDetailsDTO> GetSalesDetailsById(Guid salesId, Guid salesDetailsId, Guid scheduleDetailsId, string userRole);
    Task<Response<bool>> UpdateStudentInfo(SalesRequestDto salesDto); 
    Task<Response<bool>> UpdateStudentAdditionalInfo(SalesRequestDto salesDto);
    Task<Response<bool>> UpdateCourse(CourseRequestDto input);
    Task<Response<SalesDetailsUpdateResponsDto>> UpdateStudentDropout(UpdateSalesDetailsDTO input);
    Task<IEnumerable<EnrolledCourse>> GetEnrolledCousesById(Guid studentId);
}
