using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Student;
using TCT.LMS.DTOs.Tutor;
using TCT.LMS.DTOs.Wrappers;
using TCTModel.Student;

namespace TCT.LMS.Application.Interfaces.Services
{
    public interface IStudentService
    {
        List<StudentInfo> GetAllStudents();
        Response<StudentRequestDto> GetStudent(Guid studentId);
        Task<List<ContactResponseDto>> GetContactsByUserId(Guid userId, string role);
        Task<Response<bool>> UpdateStudent(StudentRequestDto input);
        List<StudentInfo> GetCoordinatorAllStudent(Guid coordinatorId);
        List<StudentInfo> GetBoardViseStudentList(Guid? boardId, Guid? gradeId, Guid? subjectId, string filterText);
        List<StudentInfo> GetBoardViseStudentListForReport(Guid? boardId, Guid? gradeId, Guid? subjectId);
        Task<PagedResponse<StudentInfo>> GetStudentListWithPaginations(Guid? boardId, Guid? gradeId, Guid? subjectId, string filterText, int pageSize, int pageNumber);
        Task<Response<bool>> BankDetailsForPaymentForStudent(BankDetailsUpdateRequest request);
        Task<Response<Guid>> Register(StudentRegistrationDto request);
        Task<PagedResponse<StudentInfo>> GetStudentsByTutorId(Guid tutorId, Guid? boardId, Guid? gradeId, Guid? subjectId, string filterText, int pageSize, int pageNumber);
        Task<PagedResponse<StudentInfo>> GetStudentsByCoordinatorOrOps(Guid userId, int roleId, Guid? boardId, Guid? gradeId, Guid? subjectId, string filterText, int pageSize, int pageNumber);
        Task<List<StudentInfo>> GetBoardViseStudentListByUser(Guid userId, int roleId, Guid? boardId, Guid? gradeId, Guid? subjectId, string filterText);
    }
}
