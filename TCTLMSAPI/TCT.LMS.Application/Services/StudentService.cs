using DocumentFormat.OpenXml.Office2016.Excel;
using DocumentFormat.OpenXml.Wordprocessing;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Domain;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Student;
using TCT.LMS.DTOs.Tutor;
using TCT.LMS.DTOs.Wrappers;
using TCTModel.Student;

namespace TCT.LMS.Application.Services
{
    public class StudentService : IStudentService
    {
        private readonly IStudentRepository _studentRepository;
        public StudentService(IStudentRepository studentRepository)
        {
            _studentRepository = studentRepository;
        }
        public List<StudentInfo> GetAllStudents()
        {
            var result = _studentRepository.GetAllStudents();
            return result;
        }

        public List<StudentInfo> GetCoordinatorAllStudent(Guid coordinatorId)
        {
            var result = _studentRepository.GetCoordinatorAllStudent(coordinatorId);
            return result;
        }

        public Response<StudentRequestDto> GetStudent(Guid studentId)
        {
            var result = _studentRepository.GetStudent(studentId).Result;
            return result;
        }

        public Task<Response<bool>> UpdateStudent(StudentRequestDto input)
        {
            var result = _studentRepository.UpdateStudent(input);
            return result;
        }

        public async Task<List<ContactResponseDto>> GetContactsByUserId(Guid userId, string role)
        {
            var result = await _studentRepository.GetContactsByUserId(userId, role);
            return result;
        }

        public List<StudentInfo> GetBoardViseStudentList(Guid? boardId, Guid? gradeId, Guid? subjectId, string filterText)
        {
            var result = _studentRepository.GetBoardViseStudentList(boardId, gradeId, subjectId, filterText);
            
            return result;
        }

        public List<StudentInfo> GetBoardViseStudentListForReport(Guid? boardId, Guid? gradeId, Guid? subjectId)
        {
            var result = _studentRepository.GetBoardViseStudentListForReport(boardId, gradeId, subjectId);
            return result;
        }

        public async Task<PagedResponse<StudentInfo>> GetStudentListWithPaginations(Guid? boardId, Guid? gradeId, Guid? subjectId, string filterText, int pageSize, int pageNumber) {
            var result = await _studentRepository.GetStudentListWithPaginations(boardId, gradeId, subjectId, filterText, pageSize, pageNumber);
            return result;
        }

        public async Task<Response<bool>> BankDetailsForPaymentForStudent(BankDetailsUpdateRequest request)
        {
            var result = await _studentRepository.BankDetailsForPaymentForStudent(request);
            return result;
        }

        public async Task<Response<Guid>> Register(StudentRegistrationDto request)
        {
            var result = await _studentRepository.Register(request);
            return result;
        }
        public async Task<PagedResponse<StudentInfo>> GetStudentsByTutorId(Guid tutorId, Guid? boardId, Guid? gradeId, Guid? subjectId, string filterText, int pageSize, int pageNumber) {
            var result = await _studentRepository.GetStudentsByTutorId(tutorId, boardId, gradeId, subjectId, filterText, pageSize, pageNumber);
            return result;
        }

        public async Task<PagedResponse<StudentInfo>> GetStudentsByCoordinatorOrOps(Guid userId, int roleId, Guid? boardId, Guid? gradeId, Guid? subjectId, string filterText, int pageSize, int pageNumber) {
            var result = await _studentRepository.GetStudentsByCoordinatorOrOps(userId, roleId, boardId, gradeId, subjectId, filterText, pageSize, pageNumber);
            return result;
        }

        public async Task<List<StudentInfo>> GetBoardViseStudentListByUser(Guid userId, int roleId, Guid? boardId, Guid? gradeId, Guid? subjectId, string filterText) {
            var result = await _studentRepository.GetBoardViseStudentListByUser(userId, roleId, boardId, gradeId, subjectId, filterText);
            return result;
        }
    }
}
