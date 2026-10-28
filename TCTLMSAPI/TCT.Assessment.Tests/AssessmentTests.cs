using System.IO.Compression;
using System.Linq.Expressions;
using System.Reflection;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Application.Services;
using TCT.LMS.Domain;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Assessment;
using TCT.LMS.DTOs.User;
using Document = TCT.LMS.Domain.Entities.Document;

namespace TCT.Assessment.Tests;

public class AssessmentTests
{
    [Theory]
    [InlineData("2026-10-05T09:29:59Z", false)]
    [InlineData("2026-10-05T09:30:00Z", true)]
    [InlineData("2026-10-05T10:29:59Z", true)]
    [InlineData("2026-10-05T10:30:00Z", false)]
    public void DownloadWindow_UsesIstAndExclusiveEnd(string now, bool allowed)
    {
        var test = new TestSchedule { ExamDate = new(2026, 10, 5), ExamStartTime = "15:00", ExamDurationMinutes = 60 };
        if (allowed) AssessmentRules.RequireDownloadWindow(test, DateTimeOffset.Parse(now));
        else Assert.Equal(403, Assert.Throws<AssessmentException>(() => AssessmentRules.RequireDownloadWindow(test, DateTimeOffset.Parse(now))).StatusCode);
    }

    [Theory]
    [InlineData(0, 100, true)]
    [InlineData(95.25, 100, true)]
    [InlineData(100, 100, true)]
    [InlineData(-1, 100, false)]
    [InlineData(101, 100, false)]
    [InlineData(0, 0, false)]
    [InlineData(1, 10000, false)]
    [InlineData(1.001, 100, false)]
    public void Marks_AreValidatedOnServer(decimal marks, decimal maximum, bool valid)
    {
        if (valid) AssessmentRules.ValidateMarks(marks, maximum);
        else Assert.Throws<AssessmentException>(() => AssessmentRules.ValidateMarks(marks, maximum));
    }

    [Fact] public void EmptyFiles_AreRejected() => Assert.Throws<AssessmentException>(() => AssessmentRules.ValidateFiles(new List<IFormFile>()));
    [Theory]
    [InlineData("paper.exe", 10)]
    [InlineData("paper.pdf", 0)]
    [InlineData("paper.pdf", 20971521)]
    public void InvalidFiles_AreRejected(string name, long length) => Assert.Throws<AssessmentException>(() => AssessmentRules.ValidateFiles(new List<IFormFile> { new FormFile(Stream.Null, 0, length, "Files", name) }));

    [Fact]
    public async Task Student_CannotSpoofOperationsRoleToListAllTests()
    {
        using var h = new Harness(UserRoleEnum.Student);
        var ex = await Assert.ThrowsAsync<AssessmentException>(() => h.Service.GetTestSchedulesForUploadAsync(Guid.NewGuid(), 3));
        Assert.Equal(403, ex.StatusCode);
    }

    [Fact]
    public async Task MissingIdentity_IsUnauthorized()
    {
        using var h = new Harness(UserRoleEnum.Tutor);
        h.Identity.UserId = "";
        Assert.Equal(401, (await Assert.ThrowsAsync<AssessmentException>(() => h.Service.GetScheduleOptionsAsync())).StatusCode);
    }

    [Fact]
    public async Task TutorWithoutProfile_DoesNotGetUnfilteredTests()
    {
        using var h = new Harness(UserRoleEnum.Tutor);
        h.Tutors.Clear();
        Assert.Equal(403, (await Assert.ThrowsAsync<AssessmentException>(() => h.Service.GetTestSchedulesForUploadAsync(h.UserId, 13))).StatusCode);
    }

    [Fact]
    public async Task TutorCannotUploadAnotherTutorsPaper()
    {
        using var h = new Harness(UserRoleEnum.Tutor);
        h.Test.TutorId = Guid.NewGuid();
        Assert.Equal(403, (await Assert.ThrowsAsync<AssessmentException>(() => h.Service.UploadQuestionPaperAsync(h.Paper()))).StatusCode);
    }

    [Fact]
    public async Task StudentCannotReadAnotherStudentsTests()
    {
        using var h = new Harness(UserRoleEnum.Student);
        Assert.Equal(403, (await Assert.ThrowsAsync<AssessmentException>(() => h.Service.GetStudentTestPapersAsync(Guid.NewGuid()))).StatusCode);
    }

    [Fact]
    public async Task StudentCannotDownloadBeforeStart()
    {
        using var h = new Harness(UserRoleEnum.Student);
        Assert.Equal(403, (await Assert.ThrowsAsync<AssessmentException>(() => h.Service.DownloadQuestionPaperAsync(h.Test.TestScheduleId))).StatusCode);
    }

    [Fact]
    public async Task UnrelatedStudentCannotDownloadPaper()
    {
        using var h = new Harness(UserRoleEnum.Student);
        h.Test.StudentId = Guid.NewGuid();
        Assert.Equal(403, (await Assert.ThrowsAsync<AssessmentException>(() => h.Service.DownloadQuestionPaperAsync(h.Test.TestScheduleId))).StatusCode);
    }

    [Fact]
    public async Task StudentCannotSubmitBeforeStart()
    {
        using var h = new Harness(UserRoleEnum.Student);
        Assert.Equal(409, (await Assert.ThrowsAsync<AssessmentException>(() => h.Service.SubmitAnswerSheetAsync(h.Answer()))).StatusCode);
    }

    [Fact]
    public async Task StudentCannotSubmitForAnotherStudent()
    {
        using var h = new Harness(UserRoleEnum.Student);
        var dto = h.Answer(); dto.StudentId = Guid.NewGuid();
        Assert.Equal(403, (await Assert.ThrowsAsync<AssessmentException>(() => h.Service.SubmitAnswerSheetAsync(dto))).StatusCode);
    }

    [Fact]
    public async Task DuplicateSubmissionDoesNotResetEvaluation()
    {
        using var h = new Harness(UserRoleEnum.Student);
        h.Clock.Now = AssessmentRules.EndsAt(h.Test);
        h.Submission = new() { EvaluationStatus = "Evaluated", MarksObtained = 90 };
        Assert.Equal(409, (await Assert.ThrowsAsync<AssessmentException>(() => h.Service.SubmitAnswerSheetAsync(h.Answer()))).StatusCode);
        Assert.Equal(90, h.Submission.MarksObtained);
    }

    [Fact]
    public async Task LateSubmissionPreservesEveryPageAndAuthenticatedAuditIdentity()
    {
        using var h = new Harness(UserRoleEnum.Student);
        h.Clock.Now = AssessmentRules.EndsAt(h.Test).AddMinutes(10);
        var dto = h.Answer(); dto.Files.Add(Harness.File("second.png"));
        await h.Service.SubmitAnswerSheetAsync(dto);
        Assert.NotNull(h.Submission);
        Assert.Equal(h.UserId, h.Submission!.CreatedBy);
        Assert.True(h.Submission.SubmittedOn > AssessmentRules.EndsAt(h.Test).DateTime);
        Assert.Equal("application/zip", h.Storage!.ContentType);
        using var archive = ZipFile.OpenRead(h.Storage.FilePath);
        Assert.Equal(new[] { "01-answer.pdf", "02-second.png" }, archive.Entries.Select(e => e.FullName));
        Assert.Equal(1, h.Transactions);
    }

    [Fact]
    public async Task FailedStorageDoesNotLeaveAnOrphanFile()
    {
        using var h = new Harness(UserRoleEnum.Tutor);
        h.Repository.Handlers["CreateDocumentStorageAsync"] = _ => throw new IOException("simulated storage failure");
        await Assert.ThrowsAsync<IOException>(() => h.Service.UploadQuestionPaperAsync(h.Paper()));
        Assert.Empty(Directory.GetFiles(h.Root, "*", SearchOption.AllDirectories));
    }

    [Fact]
    public async Task UploadOverridesSpoofedUploaderAndRejectsReplacementAfterStart()
    {
        using var h = new Harness(UserRoleEnum.Tutor);
        await h.Service.UploadQuestionPaperAsync(h.Paper());
        Assert.Equal(h.UserId, h.Test.QuestionPaperUploadedBy);
        h.Clock.Now = AssessmentRules.StartsAt(h.Test);
        Assert.Equal(409, (await Assert.ThrowsAsync<AssessmentException>(() => h.Service.UploadQuestionPaperAsync(h.Paper()))).StatusCode);
    }

    [Fact]
    public async Task MissingTestDoesNotReportUploadSuccess()
    {
        using var h = new Harness(UserRoleEnum.Tutor);
        var dto = h.Paper(); dto.TestScheduleId = Guid.NewGuid();
        Assert.Equal(404, (await Assert.ThrowsAsync<AssessmentException>(() => h.Service.UploadQuestionPaperAsync(dto))).StatusCode);
    }

    [Fact]
    public async Task OperationsCanScheduleFromValidAllocationAndCannotDuplicate()
    {
        using var h = new Harness(UserRoleEnum.OperationsAdmin);
        var dto = h.CreateDto();
        var id = await h.Service.CreateTestScheduleAsync(dto);
        Assert.Equal(h.CreatedTest!.TestScheduleId, id);
        Assert.Equal(h.Student.Id, h.CreatedTest.StudentId);
        Assert.Equal(h.UserId, h.CreatedTest.CreatedBy);
        h.Repository.Handlers["TestExistsAsync"] = _ => Task.FromResult(true);
        Assert.Equal(409, (await Assert.ThrowsAsync<AssessmentException>(() => h.Service.CreateTestScheduleAsync(dto))).StatusCode);
    }

    [Fact]
    public async Task CreationRejectsUnknownAllocationAndPastDate()
    {
        using var h = new Harness(UserRoleEnum.Tutor);
        var dto = h.CreateDto(); dto.ScheduleId = Guid.NewGuid();
        Assert.Equal(403, (await Assert.ThrowsAsync<AssessmentException>(() => h.Service.CreateTestScheduleAsync(dto))).StatusCode);
        dto = h.CreateDto(); dto.ExamDate = new DateTime(2020, 1, 1);
        Assert.Equal(400, (await Assert.ThrowsAsync<AssessmentException>(() => h.Service.CreateTestScheduleAsync(dto))).StatusCode);
    }

    [Fact]
    public async Task CancellationIsSoftAndBlockedAfterStart()
    {
        using var h = new Harness(UserRoleEnum.Operations);
        await h.Service.CancelTestScheduleAsync(h.Test.TestScheduleId);
        Assert.False(h.Test.IsActive);
        h.Test.IsActive = true; h.Clock.Now = AssessmentRules.StartsAt(h.Test);
        Assert.Equal(409, (await Assert.ThrowsAsync<AssessmentException>(() => h.Service.CancelTestScheduleAsync(h.Test.TestScheduleId))).StatusCode);
    }

    [Fact]
    public async Task OnlyAssignedTutorCanEvaluate()
    {
        using var h = new Harness(UserRoleEnum.Tutor);
        h.SeedSubmission(); h.Test.TutorId = Guid.NewGuid();
        Assert.Equal(403, (await Assert.ThrowsAsync<AssessmentException>(() => h.Service.EvaluateAnswerSheetAsync(h.Submission!.AnswerSheetSubmissionId, h.Evaluation()))).StatusCode);
    }

    [Fact]
    public async Task EvaluationPersistsFeedbackAndIgnoresSpoofedEvaluator()
    {
        using var h = new Harness(UserRoleEnum.Tutor);
        h.SeedSubmission();
        await h.Service.EvaluateAnswerSheetAsync(h.Submission!.AnswerSheetSubmissionId, h.Evaluation());
        Assert.Equal("Evaluated", h.Submission.EvaluationStatus);
        Assert.Equal("Good work", h.Submission.Feedback);
        Assert.Equal(h.UserId, h.Submission.EvaluatedBy);
    }

    [Fact]
    public async Task InvalidMarksCannotBeSubmittedThroughApi()
    {
        using var h = new Harness(UserRoleEnum.Tutor);
        h.SeedSubmission(); var dto = h.Evaluation(); dto.MarksObtained = 101;
        Assert.Equal(400, (await Assert.ThrowsAsync<AssessmentException>(() => h.Service.EvaluateAnswerSheetAsync(h.Submission!.AnswerSheetSubmissionId, dto))).StatusCode);
    }

    [Fact]
    public async Task NotificationOutageDoesNotTurnSavedEvaluationIntoFailure()
    {
        using var h = new Harness(UserRoleEnum.Tutor);
        h.SeedSubmission();
        h.Users.Handlers["GetByIdAsync"] = _ => Task.FromResult(new User { Id = h.Student.UserId!.Value });
        h.Notifications.Handlers["AddNotificationAsync"] = _ => throw new IOException("mail outage");
        await h.Service.EvaluateAnswerSheetAsync(h.Submission!.AnswerSheetSubmissionId, h.Evaluation());
        Assert.Equal("Evaluated", h.Submission.EvaluationStatus);
    }
}

public class Stub : DispatchProxy
{
    public Dictionary<string, Func<object?[], object?>> Handlers { get; } = new();
    protected override object? Invoke(MethodInfo? targetMethod, object?[]? args) =>
        Handlers.TryGetValue(targetMethod!.Name, out var handler) ? handler(args ?? Array.Empty<object?>()) : throw new InvalidOperationException("Unexpected call: " + targetMethod.Name);
    public static (T Value, Stub Stub) For<T>() where T : class { var value = Create<T, Stub>(); return (value, (Stub)(object)value); }
}

public sealed class TestClock : TimeProvider
{
    public DateTimeOffset Now { get; set; } = DateTimeOffset.Parse("2026-10-05T08:00:00Z");
    public override DateTimeOffset GetUtcNow() => Now;
}

internal sealed class Harness : IDisposable
{
    public Guid UserId { get; } = Guid.NewGuid();
    public CurrentUser Identity { get; }
    public Student Student { get; }
    public List<Tutor> Tutors { get; } = new();
    public TestSchedule Test { get; }
    public AssessmentScheduleOptionDto Option { get; }
    public TestSchedule? CreatedTest { get; set; }
    public AnswerSheetSubmission? Submission { get; set; }
    public DocumentStorage? Storage { get; set; }
    public Stub Repository { get; }
    public Stub Users { get; }
    public Stub Notifications { get; }
    public AssessmentService Service { get; }
    public TestClock Clock { get; } = new();
    public int Transactions { get; set; }
    public string Root { get; } = Path.Combine(Path.GetTempPath(), "tct-assessment-tests-" + Guid.NewGuid().ToString("N"));

    public Harness(UserRoleEnum role)
    {
        Identity = new() { UserId = UserId.ToString() };
        Student = new() { Id = Guid.NewGuid(), UserId = role == UserRoleEnum.Student ? UserId : Guid.NewGuid(), IsActive = true };
        Tutors.Add(new Tutor { Id = Guid.NewGuid(), UserId = role == UserRoleEnum.Tutor ? UserId : Guid.NewGuid(), IsActive = true });
        Test = new() { TestScheduleId = Guid.NewGuid(), StudentId = Student.Id, TutorId = Tutors[0].Id,
            SubjectId = Guid.NewGuid(), ExamDate = new(2026, 10, 5), ExamStartTime = "15:00", ExamDurationMinutes = 60,
            QuestionPaperUploadedOn = new(2026, 10, 4), IsActive = true };
        Option = new() { ScheduleId = Guid.NewGuid(), StudentId = Student.Id, TutorId = Test.TutorId, SubjectId = Test.SubjectId };
        var repo = Stub.For<IAssessmentRepository>(); Repository = repo.Stub;
        Repository.Handlers["GetByIdAsync"] = a => Task.FromResult((Guid)a[0]! == Test.TestScheduleId ? Test : null!);
        Repository.Handlers["GetScheduleOptionsAsync"] = a => Task.FromResult<IEnumerable<AssessmentScheduleOptionDto>>((a[0] == null || (Guid)a[0]! == Test.TutorId) ? new[] { Option } : Array.Empty<AssessmentScheduleOptionDto>());
        Repository.Handlers["TestExistsAsync"] = _ => Task.FromResult(false);
        Repository.Handlers["CreateAsync"] = a => { CreatedTest = (TestSchedule)a[0]!; return Task.FromResult(CreatedTest); };
        Repository.Handlers["UpdateAsync"] = _ => Task.CompletedTask;
        Repository.Handlers["GetAnswerSheetSubmissionAsync"] = _ => Task.FromResult(Submission!);
        Repository.Handlers["GetAnswerSheetSubmissionByIdAsync"] = _ => Task.FromResult(Submission!);
        Repository.Handlers["CreateAnswerSheetSubmissionAsync"] = a => { Submission = (AnswerSheetSubmission)a[0]!; return Task.FromResult(Submission); };
        Repository.Handlers["UpdateAnswerSheetSubmissionAsync"] = _ => Task.CompletedTask;
        Repository.Handlers["ExecuteInTransactionAsync"] = a => { Transactions++; return ((Func<Task>)a[0]!)(); };
        Repository.Handlers["CreateDocumentAsync"] = a => Task.FromResult((Document)a[0]!);
        Repository.Handlers["CreateDocumentStorageAsync"] = a => { Storage = (DocumentStorage)a[0]!; return Task.FromResult(Storage); };
        var tutors = Stub.For<ITutorRepository>();
        tutors.Stub.Handlers["FindAsync"] = a => Task.FromResult(Tutors.FirstOrDefault(((Expression<Func<Tutor, bool>>)a[0]!).Compile())!);
        tutors.Stub.Handlers["GetByIdAsync"] = a => Task.FromResult(Tutors.FirstOrDefault(t => t.Id == (Guid)a[0]!)!);
        var students = Stub.For<IStudentRepository>();
        students.Stub.Handlers["FindAsync"] = a => Task.FromResult(((Expression<Func<Student, bool>>)a[0]!).Compile()(Student) ? Student : null!);
        students.Stub.Handlers["GetByIdAsync"] = a => Task.FromResult(Student);
        var roles = Stub.For<IUserRoleRepository>();
        roles.Stub.Handlers["FindAll"] = a => Task.FromResult<IEnumerable<UserRole>>(new[] { new UserRole { UserId = UserId, RoleId = (int)role, IsActive = true } }.Where(((Expression<Func<UserRole, bool>>)a[0]!).Compile()));
        var current = Stub.For<ICurrentUserService>(); current.Stub.Handlers["GetUser"] = _ => Identity;
        var users = Stub.For<IUserRepository>(); Users = users.Stub; Users.Handlers["GetByIdAsync"] = _ => Task.FromResult<User>(null!);
        var notifications = Stub.For<INotificationService>(); Notifications = notifications.Stub;
        var details = Stub.For<INotificationDetailsRepository>();
        var environment = Stub.For<IHostEnvironment>(); environment.Stub.Handlers["get_ContentRootPath"] = _ => Root;
        Service = new AssessmentService(repo.Value, tutors.Value, students.Value, users.Value, notifications.Value,
            details.Value, roles.Value, current.Value, Clock, NullLogger<AssessmentService>.Instance, environment.Value);
    }

    public static IFormFile File(string name) => new FormFile(new MemoryStream(new byte[] { 1, 2, 3 }), 0, 3, "Files", name);
    public UploadQuestionPaperDto Paper() => new() { TestScheduleId = Test.TestScheduleId, UploadedByUserId = Guid.NewGuid(), Files = new List<IFormFile> { File("paper.pdf") } };
    public SubmitAnswerSheetDto Answer() => new() { TestScheduleId = Test.TestScheduleId, Files = new List<IFormFile> { File("answer.pdf") } };
    public CreateTestScheduleDto CreateDto() => new() { ScheduleId = Option.ScheduleId, ExamDate = Test.ExamDate, ExamStartTime = Test.ExamStartTime!, ExamDurationMinutes = 60 };
    public EvaluateAnswerSheetDto Evaluation() => new() { MarksObtained = 90, MaxMarks = 100, Feedback = "Good work", EvaluatedByUserId = Guid.NewGuid() };
    public void SeedSubmission() => Submission = new() { AnswerSheetSubmissionId = Guid.NewGuid(), TestScheduleId = Test.TestScheduleId, StudentId = Student.Id, EvaluationStatus = "Pending", IsActive = true };
    public void Dispose()
    {
        var expectedParent = Path.GetFullPath(Path.GetTempPath()).TrimEnd(Path.DirectorySeparatorChar);
        if (Directory.Exists(Root) && Path.GetDirectoryName(Path.GetFullPath(Root)) == expectedParent && Path.GetFileName(Root).StartsWith("tct-assessment-tests-"))
            Directory.Delete(Root, true); // Only this fixture's unique temporary directory.
    }
}
