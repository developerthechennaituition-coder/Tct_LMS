using System.IO.Compression;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Hosting;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Domain;
using TCT.LMS.Domain.Entities;
using TCT.LMS.Domain.Enums;
using TCT.LMS.DTOs.Assessment;

namespace TCT.LMS.Application.Services
{
    public class AssessmentService : IAssessmentService
    {
        private static readonly Guid QuestionPaperDocumentTypeId = new("A0000000-0000-0000-0000-000000000001");
        private static readonly Guid AnswerSheetDocumentTypeId = new("A0000000-0000-0000-0000-000000000002");
        private readonly IAssessmentRepository _repository;
        private readonly ITutorRepository _tutorRepository;
        private readonly IStudentRepository _studentRepository;
        private readonly IUserRepository _userRepository;
        private readonly INotificationService _notificationService;
        private readonly INotificationDetailsRepository _notificationDetailsRepository;
        private readonly IUserRoleRepository _roles;
        private readonly ICurrentUserService _currentUser;
        private readonly TimeProvider _clock;
        private readonly ILogger<AssessmentService> _logger;
        private readonly string _storageRoot;
        private DateTime LocalNow => _clock.GetUtcNow().ToOffset(TimeSpan.FromMinutes(330)).DateTime;

        public AssessmentService(IAssessmentRepository repository, ITutorRepository tutorRepository,
            IStudentRepository studentRepository, IUserRepository userRepository, INotificationService notificationService,
            INotificationDetailsRepository notificationDetailsRepository, IUserRoleRepository roles,
            ICurrentUserService currentUser, TimeProvider clock, ILogger<AssessmentService> logger, IHostEnvironment environment)
        {
            _repository = repository;
            _tutorRepository = tutorRepository;
            _studentRepository = studentRepository;
            _userRepository = userRepository;
            _notificationService = notificationService;
            _notificationDetailsRepository = notificationDetailsRepository;
            _roles = roles;
            _currentUser = currentUser;
            _clock = clock;
            _logger = logger;
            _storageRoot = Path.Combine(environment.ContentRootPath, "FileStorage", "Assessment");
        }

        private async Task<(Guid UserId, bool Staff, Guid? TutorId)> AuthorAsync()
        {
            var userId = CallerId();
            var roles = await _roles.FindAll(r => r.UserId == userId && r.IsActive);
            var staff = roles.Any(r => r.RoleId == (int)UserRoleEnum.Admin || r.RoleId == (int)UserRoleEnum.SuperAdmin
                || r.RoleId == (int)UserRoleEnum.Operations || r.RoleId == (int)UserRoleEnum.OperationsAdmin);
            if (staff) return (userId, true, null);
            if (roles.Any(r => r.RoleId == (int)UserRoleEnum.Tutor))
            {
                var tutor = await _tutorRepository.FindAsync(t => t.UserId == userId && t.IsActive);
                if (tutor != null) return (userId, false, tutor.Id);
            }
            throw new AssessmentException("Only Operations, administrators, or the assigned tutor can manage assessments.", 403);
        }

        private Guid CallerId()
        {
            if (!Guid.TryParse(_currentUser.GetUser()?.UserId, out var id) || id == Guid.Empty)
                throw new AssessmentException("Please log in again.", 401);
            return id;
        }

        private async Task<Student> StudentAsync()
        {
            var id = CallerId();
            var roles = await _roles.FindAll(r => r.UserId == id && r.IsActive && r.RoleId == (int)UserRoleEnum.Student);
            var student = await _studentRepository.FindAsync(s => s.UserId == id && s.IsActive);
            if (!roles.Any() || student == null)
                throw new AssessmentException("No active student profile is linked to this login.", 403);
            return student;
        }

        private async Task<TestSchedule> TestAsync(Guid id)
        {
            var test = await _repository.GetByIdAsync(id);
            if (test == null || !test.IsActive) throw new AssessmentException("Test not found.", 404);
            return test;
        }

        private async Task<Guid> RequireAuthorAsync(TestSchedule test)
        {
            var actor = await AuthorAsync();
            if (!actor.Staff && actor.TutorId != test.TutorId)
                throw new AssessmentException("This test is assigned to another tutor.", 403);
            return actor.UserId;
        }

        public async Task<IEnumerable<AssessmentScheduleOptionDto>> GetScheduleOptionsAsync()
        {
            var actor = await AuthorAsync();
            return await _repository.GetScheduleOptionsAsync(actor.TutorId);
        }

        public async Task<Guid> CreateTestScheduleAsync(CreateTestScheduleDto dto)
        {
            var actor = await AuthorAsync();
            var option = (await _repository.GetScheduleOptionsAsync(actor.TutorId)).FirstOrDefault(o => o.ScheduleId == dto.ScheduleId);
            if (option == null) throw new AssessmentException("Choose an active student/subject allocation available to your account.", 403);
            if (dto.ExamDate == default || dto.ExamDurationMinutes < 1 || dto.ExamDurationMinutes > 480)
                throw new AssessmentException("Choose an exam date and a duration between 1 and 480 minutes.");
            var test = new TestSchedule
            {
                TestScheduleId = Guid.NewGuid(), StudentId = option.StudentId, TutorId = option.TutorId,
                SubjectId = option.SubjectId, BoardId = option.BoardId, GradeId = option.GradeId,
                ExamDate = dto.ExamDate.Date, ExamStartTime = dto.ExamStartTime, ExamDurationMinutes = dto.ExamDurationMinutes,
                CreatedBy = actor.UserId, CreatedDate = LocalNow, IsActive = true
            };
            if (AssessmentRules.StartsAt(test) <= _clock.GetUtcNow())
                throw new AssessmentException("Schedule the test in the future (times are in IST).");
            if (await _repository.TestExistsAsync(test.StudentId, test.TutorId, test.SubjectId, test.ExamDate, test.ExamStartTime))
                throw new AssessmentException("This assessment is already scheduled.", 409);
            await _repository.CreateAsync(test);
            return test.TestScheduleId;
        }

        public async Task CancelTestScheduleAsync(Guid id)
        {
            var test = await TestAsync(id);
            var actor = await RequireAuthorAsync(test);
            if (_clock.GetUtcNow() >= AssessmentRules.StartsAt(test))
                throw new AssessmentException("A test cannot be cancelled after it has started.", 409);
            test.IsActive = false;
            test.ModifiedBy = actor;
            test.ModifiedDate = LocalNow;
            await _repository.UpdateAsync(test);
        }

        public async Task<IEnumerable<TestScheduleListItemDto>> GetTestSchedulesForUploadAsync(Guid userId, int roleId, string? filterText = null)
        {
            // Legacy query identifiers are never used for authorization.
            var actor = await AuthorAsync();
            return await _repository.GetTestSchedulesForUploadAsync(actor.TutorId, filterText);
        }

        public async Task UploadQuestionPaperAsync(UploadQuestionPaperDto dto)
        {
            var test = await TestAsync(dto.TestScheduleId);
            var actor = await RequireAuthorAsync(test);
            AssessmentRules.ValidateFiles(dto.Files);
            if (_clock.GetUtcNow() >= AssessmentRules.StartsAt(test))
                throw new AssessmentException("Question papers cannot be replaced after the test starts.", 409);
            await SaveFilesAsync(test.TestScheduleId, QuestionPaperDocumentTypeId, actor, "Question Paper", dto.Notes,
                "QuestionPapers", dto.Files, async () =>
                {
                    test.QuestionPaperNotes = dto.Notes;
                    test.QuestionPaperUploadedBy = actor;
                    test.QuestionPaperUploadedOn = LocalNow;
                    test.ModifiedBy = actor;
                    test.ModifiedDate = LocalNow;
                    await _repository.UpdateAsync(test);
                });
        }

        public async Task<IEnumerable<StudentTestPaperDto>> GetStudentTestPapersAsync(Guid studentId)
        {
            var student = await StudentAsync();
            if (studentId != Guid.Empty && studentId != student.Id)
                throw new AssessmentException("You can only view your own assessments.", 403);
            var items = (await _repository.GetStudentTestPapersAsync(student.Id)).ToList();
            foreach (var item in items) item.ServerNow = _clock.GetUtcNow();
            return items;
        }

        public async Task<(bool IsSuccess, byte[] FileData, string FileName, string ContentType)> DownloadQuestionPaperAsync(Guid testScheduleId)
        {
            var test = await TestAsync(testScheduleId);
            var userId = CallerId();
            var student = await _studentRepository.FindAsync(s => s.UserId == userId && s.IsActive);
            if (student != null && student.Id == test.StudentId)
            {
                await StudentAsync();
                AssessmentRules.RequireDownloadWindow(test, _clock.GetUtcNow());
            }
            else
                await RequireAuthorAsync(test);
            return await ReadLatestAssessmentDocumentAsync(testScheduleId, QuestionPaperDocumentTypeId);
        }

        public async Task SubmitAnswerSheetAsync(SubmitAnswerSheetDto dto)
        {
            var student = await StudentAsync();
            var test = await TestAsync(dto.TestScheduleId);
            if (test.StudentId != student.Id || (dto.StudentId != Guid.Empty && dto.StudentId != student.Id))
                throw new AssessmentException("You can only submit your own answer sheet.", 403);
            AssessmentRules.ValidateFiles(dto.Files);
            if (_clock.GetUtcNow() < AssessmentRules.StartsAt(test) || !test.QuestionPaperUploadedOn.HasValue)
                throw new AssessmentException("The test has not started or its question paper is not available.", 409);
            // Late submission is allowed and labelled. Do not silently erase an evaluated submission.
            var existing = await _repository.GetAnswerSheetSubmissionAsync(test.TestScheduleId, student.Id);
            if (existing != null)
                throw new AssessmentException("An answer sheet has already been submitted for this test.", 409);
            var submission = new AnswerSheetSubmission
            {
                AnswerSheetSubmissionId = Guid.NewGuid(), TestScheduleId = test.TestScheduleId, StudentId = student.Id,
                SubmittedOn = LocalNow, EvaluationStatus = "Pending", CreatedBy = CallerId(), CreatedDate = LocalNow, IsActive = true
            };
            await SaveFilesAsync(submission.AnswerSheetSubmissionId, AnswerSheetDocumentTypeId, CallerId(),
                "Answer Sheet", null, "AnswerSheets", dto.Files,
                async () => { await _repository.CreateAnswerSheetSubmissionAsync(submission); });
            await NotifySafelyAsync(() => NotifyTutorOfSubmissionAsync(test, student.Id), submission.AnswerSheetSubmissionId);
        }

        public async Task<IEnumerable<AnswerSheetSubmissionListItemDto>> GetAnswerSheetSubmissionsAsync(Guid tutorUserId, string filterText)
        {
            var actor = await AuthorAsync();
            var tutor = await _tutorRepository.FindAsync(t => t.UserId == actor.UserId && t.IsActive);
            if (tutor == null) throw new AssessmentException("Evaluation is available to the assigned tutor.", 403);
            return await _repository.GetAnswerSheetSubmissionsAsync(tutor.Id, filterText);
        }

        public async Task<(bool IsSuccess, byte[] FileData, string FileName, string ContentType)> DownloadAnswerSheetAsync(Guid submissionId)
        {
            var submission = await _repository.GetAnswerSheetSubmissionByIdAsync(submissionId);
            if (submission == null || !submission.IsActive) throw new AssessmentException("Submission not found.", 404);
            var test = await TestAsync(submission.TestScheduleId);
            var userId = CallerId();
            var student = await _studentRepository.FindAsync(s => s.UserId == userId && s.IsActive);
            if (student?.Id == submission.StudentId) await StudentAsync();
            else await RequireAuthorAsync(test);
            return await ReadLatestAssessmentDocumentAsync(submissionId, AnswerSheetDocumentTypeId);
        }

        public async Task EvaluateAnswerSheetAsync(Guid submissionId, EvaluateAnswerSheetDto dto)
        {
            var submission = await _repository.GetAnswerSheetSubmissionByIdAsync(submissionId);
            if (submission == null || !submission.IsActive) throw new AssessmentException("Submission not found.", 404);
            var test = await TestAsync(submission.TestScheduleId);
            var actor = await AuthorAsync();
            var tutor = await _tutorRepository.FindAsync(t => t.UserId == actor.UserId && t.IsActive);
            if (tutor?.Id != test.TutorId) throw new AssessmentException("Only the assigned tutor can evaluate this answer sheet.", 403);
            AssessmentRules.ValidateMarks(dto.MarksObtained, dto.MaxMarks);
            submission.MarksObtained = dto.MarksObtained;
            submission.MaxMarks = dto.MaxMarks;
            submission.Feedback = dto.Feedback?.Trim() ?? "";
            submission.EvaluationStatus = "Evaluated";
            submission.EvaluatedBy = actor.UserId;
            submission.EvaluatedOn = LocalNow;
            submission.ModifiedBy = actor.UserId;
            submission.ModifiedDate = LocalNow;
            await _repository.UpdateAnswerSheetSubmissionAsync(submission);
            await NotifySafelyAsync(() => NotifyStudentOfEvaluationAsync(submission), submissionId);
        }

        private async Task NotifySafelyAsync(Func<Task> notify, Guid referenceId)
        {
            // A mail outage must not report an already persisted submission/evaluation as failed.
            try { await notify(); }
            catch (Exception ex) { _logger.LogError(ex, "Assessment saved but notification failed for {ReferenceId}", referenceId); }
        }

        private async Task SaveFilesAsync(Guid referenceId, Guid documentTypeId, Guid actorId, string name,
            string? description, string subFolder, IList<IFormFile> files, Func<Task> saveState)
        {
            var folder = Path.Combine(_storageRoot, subFolder);
            Directory.CreateDirectory(folder);
            var multi = files.Count > 1;
            var fileName = multi ? name.Replace(" ", "-") + ".zip" : Path.GetFileName(files[0].FileName);
            var contentType = multi ? "application/zip" : Path.GetExtension(fileName).ToLowerInvariant() switch
            {
                ".pdf" => "application/pdf", ".png" => "image/png", ".jpg" or ".jpeg" => "image/jpeg",
                ".doc" => "application/msword", ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                _ => "application/octet-stream"
            };
            var path = Path.Combine(folder, Guid.NewGuid().ToString("N") + Path.GetExtension(fileName));
            try
            {
                if (multi)
                {
                    using var archive = ZipFile.Open(path, ZipArchiveMode.Create);
                    for (var i = 0; i < files.Count; i++)
                    {
                        var entry = archive.CreateEntry($"{i + 1:D2}-{Path.GetFileName(files[i].FileName)}");
                        await using var stream = entry.Open();
                        await files[i].CopyToAsync(stream);
                    }
                }
                else
                {
                    await using var stream = new FileStream(path, FileMode.CreateNew);
                    await files[0].CopyToAsync(stream);
                }
                await _repository.ExecuteInTransactionAsync(async () =>
                {
                    await saveState();
                    var document = await _repository.CreateDocumentAsync(new Document
                    {
                        Id = Guid.NewGuid(), UserId = actorId, DocumentName = name,
                        DocumentDescription = description ?? "", ReferenceId = referenceId, DocumentTypeId = documentTypeId,
                        CreatedBy = actorId, CreatedDate = LocalNow, IsActive = true
                    });
                    await _repository.CreateDocumentStorageAsync(new DocumentStorage
                    {
                        Id = Guid.NewGuid(), DocumentId = document.Id, FileName = fileName, FilePath = path,
                        ContentType = contentType, FileSize = new FileInfo(path).Length.ToString(),
                        CreatedBy = actorId, CreatedDate = LocalNow, IsActive = true
                    });
                });
            }
            catch
            {
                // Only the newly generated file is removed; existing uploads are retained.
                if (File.Exists(path)) File.Delete(path);
                throw;
            }
        }

        private async Task<(bool IsSuccess, byte[] FileData, string FileName, string ContentType)> ReadLatestAssessmentDocumentAsync(Guid referenceId, Guid documentTypeId)
        {
            var document = await _repository.GetLatestDocumentAsync(referenceId, documentTypeId);
            var storage = document == null ? null : await _repository.GetDocumentStorageByDocumentIdAsync(document.Id);
            if (storage == null || string.IsNullOrEmpty(storage.FilePath) || !File.Exists(storage.FilePath))
                return (false, Array.Empty<byte>(), "", "");
            return (true, await File.ReadAllBytesAsync(storage.FilePath), storage.FileName, storage.ContentType);
        }

        private async Task NotifyTutorOfSubmissionAsync(TestSchedule testSchedule, Guid studentId)
        {
            var tutor = await _tutorRepository.GetByIdAsync(testSchedule.TutorId);
            if (tutor == null)
            {
                return;
            }

            var tutorUser = await _userRepository.GetByIdAsync(tutor.UserId);
            if (tutorUser == null)
            {
                return;
            }

            var student = await _studentRepository.GetByIdAsync(studentId);
            var studentUser = student?.UserId != null ? await _userRepository.GetByIdAsync(student.UserId.Value) : null;
            var studentName = studentUser != null ? $"{studentUser.FirstName} {studentUser.LastName}" : "A student";

            var message = $"<b>{studentName}</b> has submitted the answer sheet for the test on {testSchedule.ExamDate:dd-MM-yyyy}. Please evaluate within 1 day.";

            var notification = new Notification
            {
                Id = Guid.NewGuid(),
                NotificationType = (int)NotificationType.AnswerSheetSubmitted,
                Message = message,
                CreatedBy = studentUser?.Id ?? CallerId(),
                CreatedDate = DateTime.UtcNow,
                IsActive = true,
            };
            await _notificationService.AddNotificationAsync(notification);
            await _notificationDetailsRepository.CreateAsync(new NotificationDetails
            {
                Id = Guid.NewGuid(),
                NotificationId = notification.Id,
                FromUserId = studentUser?.Id ?? CallerId(),
                ToUserId = tutorUser.Id,
                CreatedBy = studentUser?.Id ?? CallerId(),
                CreatedDate = DateTime.UtcNow,
                IsActive = true,
                IsRead = false,
            });

            if (!string.IsNullOrEmpty(tutorUser.Email))
            {
                await _notificationService.SendNotificationAsync(new MailMessage
                {
                    FromEmail = "noreply@tct.com",
                    ToEmail = tutorUser.Email,
                    Name = tutorUser.FullName ?? $"{tutorUser.FirstName} {tutorUser.LastName}",
                    Body = message,
                    MessageType = MessageType.Information,
                    Subject = $"Answer Sheet Submitted: {studentName}"
                }, CommunicationType.Email);
            }
        }

        private async Task NotifyStudentOfEvaluationAsync(AnswerSheetSubmission submission)
        {
            var student = await _studentRepository.GetByIdAsync(submission.StudentId);
            var studentUser = student?.UserId != null ? await _userRepository.GetByIdAsync(student.UserId.Value) : null;
            if (studentUser == null)
            {
                return;
            }

            var message = $"Your answer sheet has been evaluated. Marks: <b>{submission.MarksObtained}/{submission.MaxMarks}</b>.";

            var notification = new Notification
            {
                Id = Guid.NewGuid(),
                NotificationType = (int)NotificationType.AnswerSheetEvaluated,
                Message = message,
                CreatedBy = submission.EvaluatedBy ?? Guid.Empty,
                CreatedDate = DateTime.UtcNow,
                IsActive = true,
            };
            await _notificationService.AddNotificationAsync(notification);
            await _notificationDetailsRepository.CreateAsync(new NotificationDetails
            {
                Id = Guid.NewGuid(),
                NotificationId = notification.Id,
                FromUserId = submission.EvaluatedBy ?? Guid.Empty,
                ToUserId = studentUser.Id,
                CreatedBy = submission.EvaluatedBy ?? Guid.Empty,
                CreatedDate = DateTime.UtcNow,
                IsActive = true,
                IsRead = false,
            });

            if (!string.IsNullOrEmpty(studentUser.Email))
            {
                await _notificationService.SendNotificationAsync(new MailMessage
                {
                    FromEmail = "noreply@tct.com",
                    ToEmail = studentUser.Email,
                    Name = studentUser.FullName ?? $"{studentUser.FirstName} {studentUser.LastName}",
                    Body = message,
                    MessageType = MessageType.Information,
                    Subject = "Your Answer Sheet Has Been Evaluated"
                }, CommunicationType.Email);
            }
        }
    }
}
