using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Data.Common;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Assessment;
using TCT.LMS.Application.Services;

namespace TCT.LMS.Infrastructure.Repositories
{
    public class AssessmentRepository : GenericRepository<TestSchedule>, IAssessmentRepository
    {
        public readonly ApplicationDbContext _dbContext;

        public AssessmentRepository(ApplicationDbContext dbContext) : base(dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task ExecuteInTransactionAsync(Func<Task> action)
        {
            await using var transaction = await _dbContext.Database.BeginTransactionAsync();
            await action();
            await transaction.CommitAsync();
        }

        public Task<bool> TestExistsAsync(Guid studentId, Guid tutorId, Guid subjectId, DateTime examDate, string startTime) =>
            _dbContext.TestSchedule.AnyAsync(t => t.IsActive && t.StudentId == studentId && t.TutorId == tutorId
                && t.SubjectId == subjectId && t.ExamDate == examDate && t.ExamStartTime == startTime);

        public async Task<IEnumerable<AssessmentScheduleOptionDto>> GetScheduleOptionsAsync(Guid? tutorId)
        {
            return await (from schedule in _dbContext.Schedule.AsNoTracking()
                          join student in _dbContext.Student on schedule.StudentId equals student.Id
                          join studentUser in _dbContext.User on student.UserId equals studentUser.Id
                          join tutor in _dbContext.Tutor on schedule.TutorId equals tutor.Id
                          join tutorUser in _dbContext.User on tutor.UserId equals tutorUser.Id
                          join subject in _dbContext.Type_Code on schedule.SubjectId equals subject.Id
                          join board in _dbContext.Type_Code on student.BoardId equals board.Id
                          join grade in _dbContext.Type_Code on student.GradeId equals grade.Id
                          where schedule.IsActive && student.IsActive && tutor.IsActive && studentUser.IsActive && tutorUser.IsActive
                              && (!tutorId.HasValue || schedule.TutorId == tutorId.Value)
                          orderby studentUser.FirstName, subject.TypeCodeName
                          select new AssessmentScheduleOptionDto
                          {
                              ScheduleId = schedule.ScheduleId, StudentId = student.Id, TutorId = tutor.Id,
                              SubjectId = schedule.SubjectId, BoardId = student.BoardId, GradeId = student.GradeId,
                              StudentName = studentUser.FirstName + " " + studentUser.LastName,
                              TutorName = tutorUser.FirstName + " " + tutorUser.LastName,
                              SubjectName = subject.TypeCodeName, BoardName = board.TypeCodeName, GradeName = grade.TypeCodeName
                          }).ToListAsync();
        }

        public async Task<IEnumerable<TestScheduleListItemDto>> GetTestSchedulesForUploadAsync(Guid? tutorId, string filterText)
        {
            var query = _dbContext.TestSchedule.AsNoTracking().Where(t => t.IsActive);
            if (tutorId.HasValue && tutorId.Value != Guid.Empty)
            {
                query = query.Where(t => t.TutorId == tutorId.Value);
            }

            var testSchedules = await query.OrderBy(t => t.ExamDate).ToListAsync();
            if (testSchedules.Count == 0)
            {
                return Enumerable.Empty<TestScheduleListItemDto>();
            }

            var studentIds = testSchedules.Select(t => t.StudentId).Distinct().ToList();
            var typeCodeIds = testSchedules.SelectMany(t => new[] { t.SubjectId, t.BoardId, t.GradeId }).Distinct().ToList();

            var students = await _dbContext.Student.AsNoTracking().Where(s => studentIds.Contains(s.Id)).ToListAsync();
            var userIds = students.Where(s => s.UserId.HasValue).Select(s => s.UserId.Value).Distinct().ToList();
            var users = await _dbContext.User.AsNoTracking().Where(u => userIds.Contains(u.Id)).ToListAsync();
            var typeCodes = await _dbContext.Type_Code.AsNoTracking().Where(tc => typeCodeIds.Contains(tc.Id)).ToListAsync();

            var tutorIds = testSchedules.Select(t => t.TutorId).Distinct().ToList();
            var tutorNames = await (from tutor in _dbContext.Tutor
                                    join user in _dbContext.User on tutor.UserId equals user.Id
                                    where tutorIds.Contains(tutor.Id)
                                    select new { tutor.Id, Name = user.FirstName + " " + user.LastName }).ToDictionaryAsync(t => t.Id, t => t.Name);

            var result = testSchedules.Select(t =>
            {
                var student = students.FirstOrDefault(s => s.Id == t.StudentId);
                var user = student?.UserId != null ? users.FirstOrDefault(u => u.Id == student.UserId.Value) : null;
                return new TestScheduleListItemDto
                {
                    Id = t.TestScheduleId,
                    StudentId = t.StudentId,
                    StudentName = user != null ? $"{user.FirstName} {user.LastName}" : "-",
                    TutorName = tutorNames.GetValueOrDefault(t.TutorId, "-"),
                    QuestionPaperNotes = t.QuestionPaperNotes,
                    StartsAt = AssessmentRules.StartsAt(t),
                    EndsAt = AssessmentRules.EndsAt(t),
                    SubjectName = typeCodes.FirstOrDefault(tc => tc.Id == t.SubjectId)?.TypeCodeName,
                    BoardName = typeCodes.FirstOrDefault(tc => tc.Id == t.BoardId)?.TypeCodeName,
                    GradeName = typeCodes.FirstOrDefault(tc => tc.Id == t.GradeId)?.TypeCodeName,
                    ExamDate = t.ExamDate,
                    ExamStartTime = t.ExamStartTime,
                    ExamDurationMinutes = t.ExamDurationMinutes,
                    QuestionPaperUploadedOn = t.QuestionPaperUploadedOn,
                };
            }).ToList();

            if (!string.IsNullOrWhiteSpace(filterText))
            {
                result = result.Where(r =>
                    (r.StudentName?.Contains(filterText, StringComparison.OrdinalIgnoreCase) ?? false) ||
                    (r.SubjectName?.Contains(filterText, StringComparison.OrdinalIgnoreCase) ?? false)).ToList();
            }

            return result;
        }

        public async Task<IEnumerable<StudentTestPaperDto>> GetStudentTestPapersAsync(Guid studentId)
        {
            var testSchedules = await _dbContext.TestSchedule.AsNoTracking()
                .Where(t => t.StudentId == studentId && t.IsActive)
                .OrderBy(t => t.ExamDate)
                .ToListAsync();
            if (testSchedules.Count == 0)
            {
                return Enumerable.Empty<StudentTestPaperDto>();
            }

            var testScheduleIds = testSchedules.Select(t => t.TestScheduleId).ToList();
            var submissions = await _dbContext.AnswerSheetSubmission.AsNoTracking()
                .Where(s => testScheduleIds.Contains(s.TestScheduleId) && s.IsActive)
                .ToListAsync();

            var typeCodeIds = testSchedules.SelectMany(t => new[] { t.SubjectId, t.BoardId, t.GradeId }).Distinct().ToList();
            var typeCodes = await _dbContext.Type_Code.AsNoTracking().Where(tc => typeCodeIds.Contains(tc.Id)).ToListAsync();

            return testSchedules.Select(t =>
            {
                var submission = submissions.FirstOrDefault(s => s.TestScheduleId == t.TestScheduleId);
                return new StudentTestPaperDto
                {
                    Id = t.TestScheduleId,
                    SubjectName = typeCodes.FirstOrDefault(tc => tc.Id == t.SubjectId)?.TypeCodeName,
                    BoardName = typeCodes.FirstOrDefault(tc => tc.Id == t.BoardId)?.TypeCodeName,
                    GradeName = typeCodes.FirstOrDefault(tc => tc.Id == t.GradeId)?.TypeCodeName,
                    ExamDate = t.ExamDate,
                    ExamStartTime = t.ExamStartTime,
                    ExamDurationMinutes = t.ExamDurationMinutes,
                    QuestionPaperUploaded = t.QuestionPaperUploadedOn.HasValue,
                    AnswerSheetSubmitted = submission != null,
                    SubmissionId = submission?.AnswerSheetSubmissionId,
                    EvaluationStatus = submission?.EvaluationStatus,
                    MarksObtained = submission?.MarksObtained,
                    MaxMarks = submission?.MaxMarks,
                    Feedback = submission?.Feedback,
                    QuestionPaperNotes = t.QuestionPaperNotes,
                    StartsAt = AssessmentRules.StartsAt(t),
                    EndsAt = AssessmentRules.EndsAt(t),
                    IsLateSubmission = submission != null && submission.SubmittedOn > AssessmentRules.EndsAt(t).DateTime,
                };
            }).ToList();
        }

        public async Task<IEnumerable<AnswerSheetSubmissionListItemDto>> GetAnswerSheetSubmissionsAsync(Guid tutorId, string filterText)
        {
            var testSchedules = await _dbContext.TestSchedule.AsNoTracking()
                .Where(t => t.TutorId == tutorId && t.IsActive)
                .ToListAsync();
            var testScheduleIds = testSchedules.Select(t => t.TestScheduleId).ToList();

            var submissions = await _dbContext.AnswerSheetSubmission.AsNoTracking()
                .Where(s => testScheduleIds.Contains(s.TestScheduleId) && s.IsActive)
                .OrderByDescending(s => s.SubmittedOn)
                .ToListAsync();
            if (submissions.Count == 0)
            {
                return Enumerable.Empty<AnswerSheetSubmissionListItemDto>();
            }

            var studentIds = submissions.Select(s => s.StudentId).Distinct().ToList();
            var students = await _dbContext.Student.AsNoTracking().Where(s => studentIds.Contains(s.Id)).ToListAsync();
            var userIds = students.Where(s => s.UserId.HasValue).Select(s => s.UserId.Value).Distinct().ToList();
            var users = await _dbContext.User.AsNoTracking().Where(u => userIds.Contains(u.Id)).ToListAsync();
            var subjectIds = testSchedules.Select(t => t.SubjectId).Distinct().ToList();
            var typeCodes = await _dbContext.Type_Code.AsNoTracking().Where(tc => subjectIds.Contains(tc.Id)).ToListAsync();

            var result = submissions.Select(s =>
            {
                var testSchedule = testSchedules.FirstOrDefault(t => t.TestScheduleId == s.TestScheduleId);
                var student = students.FirstOrDefault(st => st.Id == s.StudentId);
                var user = student?.UserId != null ? users.FirstOrDefault(u => u.Id == student.UserId.Value) : null;
                return new AnswerSheetSubmissionListItemDto
                {
                    Id = s.AnswerSheetSubmissionId,
                    TestScheduleId = s.TestScheduleId,
                    StudentName = user != null ? $"{user.FirstName} {user.LastName}" : "-",
                    SubjectName = typeCodes.FirstOrDefault(tc => tc.Id == testSchedule.SubjectId)?.TypeCodeName,
                    ExamDate = testSchedule.ExamDate,
                    SubmittedOn = s.SubmittedOn,
                    EvaluationStatus = s.EvaluationStatus,
                    MarksObtained = s.MarksObtained,
                    MaxMarks = s.MaxMarks,
                    Feedback = s.Feedback,
                    IsLateSubmission = s.SubmittedOn > AssessmentRules.EndsAt(testSchedule).DateTime,
                };
            }).ToList();

            if (!string.IsNullOrWhiteSpace(filterText))
            {
                result = result.Where(r =>
                    (r.StudentName?.Contains(filterText, StringComparison.OrdinalIgnoreCase) ?? false) ||
                    (r.SubjectName?.Contains(filterText, StringComparison.OrdinalIgnoreCase) ?? false)).ToList();
            }

            return result;
        }

        public async Task<AnswerSheetSubmission> GetAnswerSheetSubmissionAsync(Guid testScheduleId, Guid studentId)
        {
            return await _dbContext.AnswerSheetSubmission
                .FirstOrDefaultAsync(s => s.TestScheduleId == testScheduleId && s.StudentId == studentId && s.IsActive);
        }

        public async Task<AnswerSheetSubmission> GetAnswerSheetSubmissionByIdAsync(Guid id)
        {
            return await _dbContext.AnswerSheetSubmission.FindAsync(id);
        }

        public async Task<AnswerSheetSubmission> CreateAnswerSheetSubmissionAsync(AnswerSheetSubmission entity)
        {
            await _dbContext.AnswerSheetSubmission.AddAsync(entity);
            await _dbContext.SaveChangesAsync();
            return entity;
        }

        public async Task UpdateAnswerSheetSubmissionAsync(AnswerSheetSubmission entity)
        {
            _dbContext.AnswerSheetSubmission.Update(entity);
            await _dbContext.SaveChangesAsync();
        }

        public async Task<Document> GetLatestDocumentAsync(Guid referenceId, Guid documentTypeId)
        {
            return await _dbContext.Documents.AsNoTracking()
                .Where(d => d.ReferenceId == referenceId && d.DocumentTypeId == documentTypeId && d.IsActive)
                .OrderByDescending(d => d.CreatedDate)
                .FirstOrDefaultAsync();
        }

        public async Task<DocumentStorage> GetDocumentStorageByDocumentIdAsync(Guid documentId)
        {
            return await _dbContext.DocumentStorage.AsNoTracking()
                .Where(s => s.DocumentId == documentId && s.IsActive)
                .OrderByDescending(s => s.CreatedDate)
                .FirstOrDefaultAsync();
        }

        public async Task<Document> CreateDocumentAsync(Document document)
        {
            await _dbContext.Documents.AddAsync(document);
            await _dbContext.SaveChangesAsync();
            return document;
        }

        public async Task<DocumentStorage> CreateDocumentStorageAsync(DocumentStorage storage)
        {
            await _dbContext.DocumentStorage.AddAsync(storage);
            await _dbContext.SaveChangesAsync();
            return storage;
        }
    }
}
