using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.DTOs.Address;
using TCT.LMS.DTOs.Payroll;
using TCT.LMS.DTOs.Tutor;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.Application.Interfaces.Services
{
    public interface ITutorService
    {
        Task<Response<TutorRequestDto>> AddTCTTutor(TutorRequestDto input);
        Task<Response<List<TutorRequestDto>>> GetAllTutor();
        Task<Response<List<TutorResponsesDto>>> GetAllTutorDetails();
        Task<Response<List<TutorRequestDto>>> GetAllSubmittedAttendanceTutors();
        Task<Response<List<TutorSkillsetDto>>> GetTutorSkillset(Guid tutorId);
        Task<Response<TutorCourseDetailsDto>> AddUpdateTutorSkillset(TutorCourseDetailsDto input);
        Task<Response<TutorRequestDto>> GetTutorById(Guid id);
        Task<Response<List<TutorBankAndPaymentDetailsDto>>> GetBankDetailsByTutorId(Guid id); 
        Task<Response<List<TutorBankAndPaymentDetailsDto>>> GetPaymentDetailsByTutorId(Guid id);
        Task<Response<List<TutorCourseDetailsDto>>> GetTutorSubjects(Guid tutorId);
        Task<Response<List<TutorResponseDto>>> GetTutorsByAvailability(Guid studentId, Guid salesId, Guid subjectId);
        Task<Response<List<TutorResponsesDto>>> GetAllTutorDetailsWithFilter(string boardIds, string gradeIds, string gradeGroupIds, string subjectIds, string search, int pageSize, int pageNumber);
        Task<Response<bool>> UpdateTutorPayment(UpdateTutorPaymentDto input);
        Task<Response<bool>> DeleteTutorSkillset(Guid id);
    }
}
