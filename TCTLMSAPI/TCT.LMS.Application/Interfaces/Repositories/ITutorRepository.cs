using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Tutor;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.Application.Interfaces.Repositories
{
    public interface ITutorRepository : IGenericRepository<Tutor>
    {
        Task<Response<TutorRequestDto>> AddTutor(TutorRequestDto input);
        Task<Response<List<TutorRequestDto>>> GetAllTutor();
        Task<Response<List<TutorResponsesDto>>> GetAllTutorDetails();
        Task<Response<List<TutorRequestDto>>> GetAllSubmittedAttendanceTutors();
        Task<Response<List<TutorCourseDetailsDto>>> GetTutorSkillset(Guid tutorId);
        Task<Response<TutorCourseDetailsDto>> AddUpdateTutorSkillset(TutorCourseDetailsDto input);
        Task<Response<TutorRequestDto>> GetTutorById(Guid id);
        Task<Response<List<TutorBankAndPaymentDetailsDto>>> GetBankDetailsByTutorId(Guid id);
        Task<Response<List<TutorBankAndPaymentDetailsDto>>> GetPaymentDetailsByTutorId(Guid id);
        Task<Response<List<TutorResponseDto>>> GetTutorsByAvailability(Guid studentId, Guid salesId, Guid subjectId);
        Task<Response<bool>> UpdateTutorPayment(UpdateTutorPaymentDto input);
        Task<Response<List<TutorResponsesDto>>> GetAllTutorDetailsWithFilter(string boardIds, string gradeIds, string gradeGroupIds, string subjectIds, string search, int pageSize, int pageNumber);
        Task<Response<bool>> DeleteTutorSkillset(Guid id);
    }
}
