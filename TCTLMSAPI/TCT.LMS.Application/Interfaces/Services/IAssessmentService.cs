using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TCT.LMS.DTOs.Assessment;

namespace TCT.LMS.Application.Interfaces.Services
{
    public interface IAssessmentService
    {
        Task<IEnumerable<AssessmentScheduleOptionDto>> GetScheduleOptionsAsync();
        Task<Guid> CreateTestScheduleAsync(CreateTestScheduleDto dto);
        Task CancelTestScheduleAsync(Guid id);
        Task<IEnumerable<TestScheduleListItemDto>> GetTestSchedulesForUploadAsync(Guid userId, int roleId, string? filterText = null);
        Task UploadQuestionPaperAsync(UploadQuestionPaperDto dto);

        Task<IEnumerable<StudentTestPaperDto>> GetStudentTestPapersAsync(Guid studentId);
        Task<(bool IsSuccess, byte[] FileData, string FileName, string ContentType)> DownloadQuestionPaperAsync(Guid testScheduleId);
        Task SubmitAnswerSheetAsync(SubmitAnswerSheetDto dto);

        Task<IEnumerable<AnswerSheetSubmissionListItemDto>> GetAnswerSheetSubmissionsAsync(Guid tutorUserId, string filterText);
        Task<(bool IsSuccess, byte[] FileData, string FileName, string ContentType)> DownloadAnswerSheetAsync(Guid submissionId);
        Task EvaluateAnswerSheetAsync(Guid submissionId, EvaluateAnswerSheetDto dto);
    }
}
