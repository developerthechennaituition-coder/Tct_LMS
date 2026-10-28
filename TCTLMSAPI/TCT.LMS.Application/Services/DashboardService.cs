using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Dashboard;
using TCT.LMS.DTOs.Schedule;
using TCT.LMS.DTOs.Student;
using TCT.LMS.DTOs.Tutor;

namespace TCT.LMS.Application.Services
{
    public class DashboardService : IDashboardService
    {
        private readonly IDashboardRepository _repository;

        public DashboardService(IDashboardRepository repository)
        {
            _repository = repository;
        }
        public async Task<AccountDashboardDto> GetAccountsSummaryAsync(Guid userId)
        {
            return await _repository.GetAccountsSummaryAsync(userId);
        }
        public async Task<List<StudentAccountStatusDto>> GetStudentAccountStatusAsync()
        {
            return await _repository.GetStudentAccountStatusAsync();
        }
        public async Task<List<AccountsScheduleDto>> GetStudentScheduleSummaryById(Guid studentId, string month = null, int? year = null)
        {
            return await _repository.GetStudentScheduleSummaryById(studentId, month, year);
        }
        public async Task<List<TutorAccountStatusDto>> GetTutorAccountStatusAsync()
        {
            return await _repository.GetTutorAccountStatusAsync();
        }
        public async Task<List<AccountsScheduleDto>> GetTutorScheduleSummaryById(Guid studentId, string? month = null, int? year = null)
        {
            return await _repository.GetTutorScheduleSummaryById(studentId, month, year);
        }

        public async Task SubmitFeedbackAsync(TctLearningExperienceFeedbackDto dto)
        {
            if (dto == null) throw new ArgumentNullException(nameof(dto));
            try
            {
                var entity = new TctLearningExperienceFeedback
                {
                    Id = dto.Id,
                    UserId = dto.UserId,
                    TeacherQualityRating = dto.TeacherQualityRating,
                    OverallExperienceRating = dto.OverallExperienceRating,
                    IssueTeachingMethod = dto.IssueTeachingMethod,
                    IssuePunctuality = dto.IssuePunctuality,
                    IssueCommunication = dto.IssueCommunication,
                    IssueTechnicalIssues = dto.IssueTechnicalIssues,
                    IssueOther = dto.IssueOther,
                    Comments = dto.Comments,
                    CreatedOnUtc = DateTime.UtcNow,
                    CreatedByUserId = dto.UserId, // or use logged-in user from claims if different
                    IsFlaggedForReview = ShouldFlag(dto)
                };

                await _repository.AddLearningExperienceFeedbackAsync(entity);
            }
            catch(Exception ex)
            {
                throw new ArgumentNullException(nameof(dto));
            }
        }
        private bool ShouldFlag(TctLearningExperienceFeedbackDto dto)
        {
            var lowRatings = new[] { "poor", "average" };
            return lowRatings.Contains(dto.TeacherQualityRating?.ToLowerInvariant())
                || lowRatings.Contains(dto.OverallExperienceRating?.ToLowerInvariant());
        }

        public async Task SubmitTutorDailyFeedbackAsync(TctTutorDailyFeedbackDto dto)
        {
            if (dto == null) throw new ArgumentNullException(nameof(dto));

            var entity = new TctTutorDailyFeedback
            {
                Id = dto.Id == Guid.Empty ? Guid.NewGuid() : dto.Id,
                UserId = dto.UserId,
                FeelingRating = dto.FeelingRating,
                Comments = dto.Comments,
                CreatedOnUtc = DateTime.UtcNow,
                CreatedByUserId = dto.UserId,
                IsFlaggedForReview = new[] { "poor", "average" }.Contains(dto.FeelingRating?.ToLowerInvariant())
            };

            await _repository.AddTutorDailyFeedbackAsync(entity);
        }

        public async Task<bool> HasStudentFeedbackTodayAsync(Guid userId)
        {
            return await _repository.HasStudentFeedbackTodayAsync(userId);
        }

        public async Task<bool> HasTutorFeedbackTodayAsync(Guid userId)
        {
            return await _repository.HasTutorFeedbackTodayAsync(userId);
        }

        public async Task<bool> HasStudentCompletedFirstClassAsync(Guid userId)
        {
            return await _repository.HasStudentCompletedFirstClassAsync(userId);
        }

        public async Task<bool> HasTutorCompletedFirstClassAsync(Guid userId)
        {
            return await _repository.HasTutorCompletedFirstClassAsync(userId);
        }

        public async Task<bool> HasTutorMappedStudentsAsync(Guid userId)
        {
            return await _repository.HasTutorMappedStudentsAsync(userId);
        }
    }
}
