using DocumentFormat.OpenXml.Office2010.Excel;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Domain.Entities;
using TCT.LMS.Domain;
using TCT.LMS.Domain.Enums;
using TCT.LMS.DTOs.Payroll;
using TCT.LMS.DTOs.Tutor;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.Application.Services
{
    public class TutorService : ITutorService
    {
        private readonly ITutorRepository _tutorRepository;
        private readonly IScheduleService _scheduleService;
        private readonly INotificationService _notificationService;
        public TutorService(ITutorRepository tutorRepository, IScheduleService scheduleService, INotificationService notificationService)
        {
            _tutorRepository = tutorRepository;
            _scheduleService = scheduleService;
            _notificationService = notificationService;
        }
        public async Task<Response<TutorRequestDto>> AddTCTTutor(TutorRequestDto input)
        {
            var result = await _tutorRepository.AddTutor(input);
            if (result?.Succeeded == true && result.Data?.IsSystemUser == false
                && !string.IsNullOrEmpty(result.Data.Email)
                && !string.IsNullOrEmpty(result.Data.GeneratedPassword))
            {
                var message = new MailMessage
                {
                    Link = string.Empty,
                    FromEmail = "noreply@tct.com",
                    ToEmail = result.Data.Email,
                    Name = $"{result.Data.FirstName} {result.Data.LastName}",
                    Password = result.Data.GeneratedPassword,
                    MessageType = MessageType.Registration,
                    Subject = "Welcome to The Chennai Tuition Learning Management System!"
                };
                await _notificationService.SendNotificationAsync(message, CommunicationType.Email);
            }
            return result;
        }

        public async Task<Response<TutorCourseDetailsDto>> AddUpdateTutorSkillset(TutorCourseDetailsDto input)
        {
            var result = await _tutorRepository.AddUpdateTutorSkillset(input);
            return result;
        }

        public async Task<Response<List<TutorRequestDto>>> GetAllTutor()
        {
            var result = await _tutorRepository.GetAllTutor();
            return result;
        }

        public async Task<Response<TutorRequestDto>> GetTutorById(Guid id)
        {
            var result = await _tutorRepository.GetTutorById(id);
            return result;
        }

        public async Task<Response<List<TutorSkillsetDto>>> GetTutorSkillset(Guid tutorId)
        {
            Response<List<TutorSkillsetDto>> response = new Response<List<TutorSkillsetDto>>();
            var result = await _tutorRepository.GetTutorSkillset(tutorId);

            var grouped = result.Data.GroupBy(x => new { x.GradeName, x.BoardName })
                .Select(g => new TutorSkillsetDto()
                {
                    Id = g.First().Id,
                    GradeId = g.Where(x => x.GradeName == g.Key.GradeName).First().GradeId,
                    BoardId = g.Where(x => x.BoardName == g.Key.BoardName).First().BoardId,
                    GradeName = g.Key.GradeName,
                    BoardName = g.Key.BoardName,
                    SubjectIds = g.Select(s => new { value = s.SubjectId, label = s.SubjectName }),
                    SubjectName = string.Join(", ", g.Select(x => x.SubjectName).Distinct())
                }).ToList();
            response.Data = grouped;
            return response;
        }

        public async Task<Response<List<TutorCourseDetailsDto>>> GetTutorSubjects(Guid tutorId)
        {
            Response<List<TutorCourseDetailsDto>> response = new Response<List<TutorCourseDetailsDto>>();
            response = await _tutorRepository.GetTutorSkillset(tutorId);
            return response;
        }

        public async Task<Response<List<TutorRequestDto>>> GetAllSubmittedAttendanceTutors()
        {
            var result = await _tutorRepository.GetAllSubmittedAttendanceTutors();
            return result;
        }

        public async Task<Response<List<TutorBankAndPaymentDetailsDto>>> GetBankDetailsByTutorId(Guid id)
        {
            var result = await _tutorRepository.GetBankDetailsByTutorId(id);
            return result;
        }
        public async Task<Response<List<TutorBankAndPaymentDetailsDto>>> GetPaymentDetailsByTutorId(Guid id)
        {
            var result = await _tutorRepository.GetPaymentDetailsByTutorId(id);
            return result;
        }

        public async Task<Response<List<TutorResponseDto>>> GetTutorsByAvailability(Guid studentId, Guid salesId, Guid subjectId)
        {
            var result = await _tutorRepository.GetTutorsByAvailability(studentId, salesId, subjectId);
            return result;
        }

        public async Task<Response<bool>> UpdateTutorPayment(UpdateTutorPaymentDto input)
        {
            var result = await _tutorRepository.UpdateTutorPayment(input);
            return result;
        }
        public async Task<Response<List<TutorResponsesDto>>> GetAllTutorDetails()
        {
            var result = await _tutorRepository.GetAllTutorDetails();
            return result;
        }
        public async Task<Response<List<TutorResponsesDto>>> GetAllTutorDetailsWithFilter(string boardIds, string gradeIds, string gradeGroupIds, string subjectIds, string search, int pageSize , int pageNumber)
        {
            var result = await _tutorRepository.GetAllTutorDetailsWithFilter(boardIds, gradeIds, gradeGroupIds, subjectIds, search, pageSize, pageNumber);
            return result;
        }
        public async Task<Response<bool>> DeleteTutorSkillset(Guid id)
        {
            return await _tutorRepository.DeleteTutorSkillset(id);
        }
    }
}
