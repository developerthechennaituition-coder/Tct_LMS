using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Assessment;

namespace TCT.LMS.Application.Interfaces.Repositories
{
    public interface IAssessmentRepository : IGenericRepository<TestSchedule>
    {
        Task<IEnumerable<AssessmentScheduleOptionDto>> GetScheduleOptionsAsync(Guid? tutorId);
        Task ExecuteInTransactionAsync(Func<Task> action);
        Task<bool> TestExistsAsync(Guid studentId, Guid tutorId, Guid subjectId, DateTime examDate, string startTime);
        Task<IEnumerable<TestScheduleListItemDto>> GetTestSchedulesForUploadAsync(Guid? tutorId, string filterText);
        Task<IEnumerable<StudentTestPaperDto>> GetStudentTestPapersAsync(Guid studentId);
        Task<IEnumerable<AnswerSheetSubmissionListItemDto>> GetAnswerSheetSubmissionsAsync(Guid tutorId, string filterText);

        Task<AnswerSheetSubmission> GetAnswerSheetSubmissionAsync(Guid testScheduleId, Guid studentId);
        Task<AnswerSheetSubmission> GetAnswerSheetSubmissionByIdAsync(Guid id);
        Task<AnswerSheetSubmission> CreateAnswerSheetSubmissionAsync(AnswerSheetSubmission entity);
        Task UpdateAnswerSheetSubmissionAsync(AnswerSheetSubmission entity);

        // Question paper / answer sheet files are stored via the shared Document + DocumentStorage
        // tables (ReferenceId = TestScheduleId or AnswerSheetSubmissionId). Re-uploads add a newer
        // Document row rather than overwriting; the latest one by CreatedDate is treated as current.
        Task<Document> GetLatestDocumentAsync(Guid referenceId, Guid documentTypeId);
        Task<DocumentStorage> GetDocumentStorageByDocumentIdAsync(Guid documentId);
        Task<Document> CreateDocumentAsync(Document document);
        Task<DocumentStorage> CreateDocumentStorageAsync(DocumentStorage storage);
    }
}
