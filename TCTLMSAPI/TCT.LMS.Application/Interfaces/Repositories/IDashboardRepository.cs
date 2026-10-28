using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Dashboard;
using TCT.LMS.DTOs.Schedule;
using TCT.LMS.DTOs.Student;
using TCT.LMS.DTOs.Tutor;

namespace TCT.LMS.Application.Interfaces.Repositories
{
    public interface IDashboardRepository
    {
        Task<AccountDashboardDto> GetAccountsSummaryAsync(Guid userId);
        Task<List<StudentAccountStatusDto>> GetStudentAccountStatusAsync();
        Task<List<AccountsScheduleDto>> GetStudentScheduleSummaryById(Guid studentId, string? month = null, int? year = null);
        Task<List<TutorAccountStatusDto>> GetTutorAccountStatusAsync();
        Task<List<AccountsScheduleDto>> GetTutorScheduleSummaryById(Guid studentId, string? month = null, int? year = null);
        Task AddLearningExperienceFeedbackAsync(TctLearningExperienceFeedback feedback);
        Task AddTutorDailyFeedbackAsync(TctTutorDailyFeedback feedback);
        Task<bool> HasStudentFeedbackTodayAsync(Guid userId);
        Task<bool> HasTutorFeedbackTodayAsync(Guid userId);
        Task<bool> HasStudentCompletedFirstClassAsync(Guid userId);
        Task<bool> HasTutorCompletedFirstClassAsync(Guid userId);
        Task<bool> HasTutorMappedStudentsAsync(Guid userId);
    }
}
