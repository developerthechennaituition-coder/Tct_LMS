using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Application.Services;
using TCT.LMS.Domain.Entities;

namespace TCT.Assessment.Tests;

/// <summary>
/// Tutor Change / Student Change rules in AssignmentChangeRequestService. The repositories are stubs that
/// throw on any call a test does not expect, so "not saved" / "not reassigned" is asserted by omission.
/// </summary>
public class AssignmentChangeRequestTests
{
    private static readonly DateTime Now = new(2026, 10, 24, 10, 30, 0);
    private static readonly string[] Student = { "Student" };
    private static readonly string[] Tutor = { "Tutor" };
    private static readonly string[] Operations = { "Operations" };
    private static readonly string[] OperationsAdmin = { "OperationsAdmin" };
    private static readonly CancellationToken None = CancellationToken.None;

    private sealed class Fixture
    {
        public (IAssignmentChangeRequestRepository Value, Stub Stub) Repo = Stub.For<IAssignmentChangeRequestRepository>();
        public (IScheduleRepository Value, Stub Stub) Schedules = Stub.For<IScheduleRepository>();
        public AssignmentChangeRequestService Service => new(Repo.Value, Schedules.Value, () => Now);
    }

    private static ChangeAssignmentDto Course(Guid? id = null, int? pending = null) => new()
    {
        SalesDetailsId = id ?? Guid.NewGuid(),
        StudentId = Guid.NewGuid(),
        TutorId = Guid.NewGuid(),
        StudentName = "Parvesh P",
        TutorName = "Abhay A",
        SubjectName = "Maths",
        PendingRequestNo = pending,
    };

    private static ChangeRequestDto Request(string type = AssignmentChangeRequestType.TutorChange, Guid? owner = null,
        string status = AssignmentChangeRequestStatus.Pending) => new()
    {
        Id = Guid.NewGuid(),
        RequestNo = 7,
        RequestType = type,
        SalesDetailsId = Guid.NewGuid(),
        CurrentTutorId = Guid.NewGuid(),
        StudentName = "Parvesh P",
        SubjectName = "Maths",
        Status = status,
        OwnerUserId = owner,
    };

    // ─── Requester role ─────────────────────────────────────────────────────────

    [Fact]
    public void RequestTypeFollowsTheCallersRole()
    {
        var service = new Fixture().Service;
        Assert.Equal(AssignmentChangeRequestType.TutorChange, service.RequestTypeForRequester(Student));
        Assert.Equal(AssignmentChangeRequestType.StudentChange, service.RequestTypeForRequester(Tutor));
        Assert.Null(service.RequestTypeForRequester(new[] { "Coordinator" }));
        Assert.Equal("/lms/change-request/tutor-change", service.MenuLinkFor(AssignmentChangeRequestType.TutorChange, operations: false));
        Assert.Equal("/lms/change-request/student-change", service.MenuLinkFor(AssignmentChangeRequestType.StudentChange, operations: false));
        Assert.Equal("/lms/operation/change-requests/students", service.MenuLinkFor(AssignmentChangeRequestType.TutorChange, operations: true));
        Assert.Equal("/lms/operation/change-requests/tutors", service.MenuLinkFor(AssignmentChangeRequestType.StudentChange, operations: true));
    }

    [Fact]
    public void ReasonListsMatchTheRequirement()
    {
        Assert.Equal(new[] { "Lack of Compatibility", "Unprofessional Behaviour", "Communication Barrier", "Skill Mismatch", "Lack of Personalization" },
            AssignmentChangeRequestReasons.TutorChange);
        Assert.Equal(new[] { "Lack of Effort and Commitment", "Disrespectful or Disruptive Behaviour", "Frequent Payment Delays", "Unrealistic Expectations", "Incompatible Goals or Levels" },
            AssignmentChangeRequestReasons.StudentChange);
    }

    [Fact]
    public async Task OtherRolesCannotListOrSubmit()
    {
        var service = new Fixture().Service;
        Assert.Equal(403, (await service.GetMyAssignmentsAsync(Guid.NewGuid(), new[] { "Coordinator" }, None)).StatusCode);
        Assert.Equal(403, (await service.SubmitAsync(Guid.NewGuid(), new[] { "Accounts" },
            new SubmitChangeRequest { SalesDetailsId = Guid.NewGuid(), Reason = "Skill Mismatch", Description = "x" }, None)).StatusCode);
    }

    [Fact]
    public async Task StudentSeesOwnCoursesWithTutorChangeReasons()
    {
        var f = new Fixture();
        var caller = Guid.NewGuid();
        var course = Course();
        f.Repo.Stub.Handlers["GetStudentAssignmentsAsync"] = args =>
        {
            Assert.Equal(caller, args[0]);
            return Task.FromResult<IReadOnlyList<ChangeAssignmentDto>>(new[] { course });
        };
        var result = await f.Service.GetMyAssignmentsAsync(caller, Student, None);
        Assert.True(result.Succeeded);
        Assert.Equal(AssignmentChangeRequestType.TutorChange, result.Data!.RequestType);
        Assert.Equal(AssignmentChangeRequestReasons.TutorChange, result.Data.Reasons);
        Assert.Same(course, Assert.Single(result.Data.Assignments));
    }

    [Fact]
    public async Task TutorSeesOwnCoursesWithStudentChangeReasons()
    {
        var f = new Fixture();
        var caller = Guid.NewGuid();
        f.Repo.Stub.Handlers["GetTutorAssignmentsAsync"] = args =>
        {
            Assert.Equal(caller, args[0]);
            return Task.FromResult<IReadOnlyList<ChangeAssignmentDto>>(new[] { Course() });
        };
        var result = await f.Service.GetMyAssignmentsAsync(caller, Tutor, None);
        Assert.Equal(AssignmentChangeRequestType.StudentChange, result.Data!.RequestType);
        Assert.Equal(AssignmentChangeRequestReasons.StudentChange, result.Data.Reasons);
    }

    // ─── Submission validation ──────────────────────────────────────────────────

    [Theory]
    [InlineData(null, "Valid description", "Please select a reason.")]
    [InlineData("", "Valid description", "Please select a reason.")]
    [InlineData("Frequent Payment Delays", "Valid description", "Please select a reason.")] // a tutor's reason
    [InlineData("Skill Mismatch", null, "Please describe the reason for your request.")]
    [InlineData("Skill Mismatch", "   \t  ", "Please describe the reason for your request.")]
    public async Task StudentSubmissionIsValidatedBeforeAnythingIsSaved(string? reason, string? description, string message)
    {
        var result = await new Fixture().Service.SubmitAsync(Guid.NewGuid(), Student,
            new SubmitChangeRequest { SalesDetailsId = Guid.NewGuid(), Reason = reason, Description = description }, None);
        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
        Assert.Equal(message, result.Message);
    }

    [Fact]
    public async Task DescriptionLongerThanTheLimitIsRejected()
    {
        var result = await new Fixture().Service.SubmitAsync(Guid.NewGuid(), Tutor, new SubmitChangeRequest
        {
            SalesDetailsId = Guid.NewGuid(), Reason = "Unrealistic Expectations", Description = new string('a', 2001),
        }, None);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task ACourseOutsideTheCallersAssignmentsIsRefused()
    {
        var f = new Fixture();
        f.Repo.Stub.Handlers["GetStudentAssignmentsAsync"] = _ => Task.FromResult<IReadOnlyList<ChangeAssignmentDto>>(new[] { Course() });
        var result = await f.Service.SubmitAsync(Guid.NewGuid(), Student, new SubmitChangeRequest
        {
            SalesDetailsId = Guid.NewGuid(), Reason = "Skill Mismatch", Description = "Not a fit.",
        }, None);
        Assert.Equal(404, result.StatusCode); // CreateRequestAsync was never called (the stub would throw)
    }

    [Fact]
    public async Task AnOpenRequestForTheSameCourseBlocksAnother()
    {
        var f = new Fixture();
        var course = Course(pending: 12);
        f.Repo.Stub.Handlers["GetStudentAssignmentsAsync"] = _ => Task.FromResult<IReadOnlyList<ChangeAssignmentDto>>(new[] { course });
        var result = await f.Service.SubmitAsync(Guid.NewGuid(), Student, new SubmitChangeRequest
        {
            SalesDetailsId = course.SalesDetailsId, Reason = "Skill Mismatch", Description = "Not a fit.",
        }, None);
        Assert.Equal(409, result.StatusCode);
        Assert.Contains("#12", result.Message);
    }

    [Fact]
    public async Task SubmissionUsesTheServerSideAssignmentNotThePayload()
    {
        var f = new Fixture();
        var caller = Guid.NewGuid();
        var course = Course();
        AssignmentChangeRequest? saved = null;
        f.Repo.Stub.Handlers["GetStudentAssignmentsAsync"] = _ => Task.FromResult<IReadOnlyList<ChangeAssignmentDto>>(new[] { course });
        f.Repo.Stub.Handlers["CreateRequestAsync"] = args =>
        {
            saved = (AssignmentChangeRequest)args[0]!;
            return Task.FromResult((true, 41));
        };
        var result = await f.Service.SubmitAsync(caller, Student, new SubmitChangeRequest
        {
            SalesDetailsId = course.SalesDetailsId, Reason = "  Communication Barrier ", Description = "  We cannot understand each other.  ",
        }, None);
        Assert.True(result.Succeeded);
        Assert.Equal(41, result.Data);
        Assert.NotNull(saved);
        Assert.Equal(AssignmentChangeRequestType.TutorChange, saved!.RequestType);
        Assert.Equal(AssignmentChangeRequestStatus.Pending, saved.Status);
        Assert.Equal(course.StudentId, saved.StudentId);
        Assert.Equal(course.TutorId, saved.CurrentTutorId);
        Assert.Equal(caller, saved.CreatedBy);
        Assert.Equal("Communication Barrier", saved.Reason);
        Assert.Equal("We cannot understand each other.", saved.Description);
    }

    [Fact]
    public async Task TutorSubmissionCreatesAStudentChangeRequest()
    {
        var f = new Fixture();
        var course = Course();
        string? type = null;
        f.Repo.Stub.Handlers["GetTutorAssignmentsAsync"] = _ => Task.FromResult<IReadOnlyList<ChangeAssignmentDto>>(new[] { course });
        f.Repo.Stub.Handlers["CreateRequestAsync"] = args => { type = ((AssignmentChangeRequest)args[0]!).RequestType; return Task.FromResult((true, 5)); };
        var result = await f.Service.SubmitAsync(Guid.NewGuid(), Tutor, new SubmitChangeRequest
        {
            SalesDetailsId = course.SalesDetailsId, Reason = "Frequent Payment Delays", Description = "Fees unpaid for two months.",
        }, None);
        Assert.True(result.Succeeded);
        Assert.Equal(AssignmentChangeRequestType.StudentChange, type);
    }

    [Fact]
    public async Task ADuplicateCaughtByTheDatabaseIsReportedAsAConflict()
    {
        var f = new Fixture();
        var course = Course();
        f.Repo.Stub.Handlers["GetStudentAssignmentsAsync"] = _ => Task.FromResult<IReadOnlyList<ChangeAssignmentDto>>(new[] { course });
        f.Repo.Stub.Handlers["CreateRequestAsync"] = _ => Task.FromResult((false, 0));
        var result = await f.Service.SubmitAsync(Guid.NewGuid(), Student, new SubmitChangeRequest
        {
            SalesDetailsId = course.SalesDetailsId, Reason = "Skill Mismatch", Description = "Double click.",
        }, None);
        Assert.Equal(409, result.StatusCode);
    }

    // ─── Operations scope ───────────────────────────────────────────────────────

    [Fact]
    public async Task OperationsSeesOnlyOwnStudentsAndAdminsSeeAll()
    {
        var f = new Fixture();
        var caller = Guid.NewGuid();
        Guid? seenOwner = Guid.Empty;
        f.Repo.Stub.Handlers["GetRequestsAsync"] = args =>
        {
            Assert.Equal(AssignmentChangeRequestType.StudentChange, args[0]);
            seenOwner = (Guid?)args[1];
            return Task.FromResult<IReadOnlyList<ChangeRequestDto>>(Array.Empty<ChangeRequestDto>());
        };
        await f.Service.GetRequestsAsync(caller, Operations, AssignmentChangeRequestType.StudentChange, None);
        Assert.Equal(caller, seenOwner);
        await f.Service.GetRequestsAsync(caller, OperationsAdmin, AssignmentChangeRequestType.StudentChange, None);
        Assert.Null(seenOwner);
        await f.Service.GetRequestsAsync(caller, new[] { "SuperAdmin" }, AssignmentChangeRequestType.StudentChange, None);
        Assert.Null(seenOwner);
        Assert.Equal(403, (await f.Service.GetRequestsAsync(caller, new[] { "Coordinator" }, AssignmentChangeRequestType.StudentChange, None)).StatusCode);
        Assert.Equal(403, (await f.Service.GetRequestsAsync(caller, Student, AssignmentChangeRequestType.TutorChange, None)).StatusCode);
    }

    [Fact]
    public async Task ARequestOfAnotherOwnerOrTheOtherListIsNotFound()
    {
        var f = new Fixture();
        var caller = Guid.NewGuid();
        var othersRequest = Request(owner: Guid.NewGuid());
        var tutorRequest = Request(type: AssignmentChangeRequestType.StudentChange, owner: caller);
        f.Repo.Stub.Handlers["GetRequestAsync"] = args =>
            Task.FromResult<ChangeRequestDto?>((Guid)args[0]! == othersRequest.Id ? othersRequest : tutorRequest);

        var approveOthers = await f.Service.ApproveAsync(caller, Operations, AssignmentChangeRequestType.TutorChange, othersRequest.Id,
            new ApproveChangeRequest { NewTutorId = Guid.NewGuid() }, None);
        Assert.Equal(404, approveOthers.StatusCode);
        var wrongList = await f.Service.RejectAsync(caller, Operations, AssignmentChangeRequestType.TutorChange, tutorRequest.Id,
            new RejectChangeRequest { Note = "No" }, None);
        Assert.Equal(404, wrongList.StatusCode);
        // Neither ApproveAsync nor RejectAsync reached the repository (the stub would throw).
    }

    // ─── Approval ───────────────────────────────────────────────────────────────

    private static Fixture ApprovalFixture(ChangeRequestDto request, params ReplacementTutorDto[] tutors)
    {
        var f = new Fixture();
        f.Repo.Stub.Handlers["GetRequestAsync"] = _ => Task.FromResult<ChangeRequestDto?>(request);
        f.Repo.Stub.Handlers["GetReplacementTutorsAsync"] = _ => Task.FromResult<IReadOnlyList<ReplacementTutorDto>>(tutors);
        return f;
    }

    [Fact]
    public async Task ApprovalNeedsAnEligibleTutorWithARate()
    {
        var request = Request();
        var noRate = new ReplacementTutorDto { TutorId = Guid.NewGuid(), UserId = Guid.NewGuid(), Name = "No Rate", Rate = 0 };
        var f = ApprovalFixture(request, noRate);
        Assert.Equal(400, (await f.Service.ApproveAsync(Guid.NewGuid(), OperationsAdmin, request.RequestType, request.Id,
            new ApproveChangeRequest { NewTutorId = Guid.Empty }, None)).StatusCode);
        Assert.Equal(400, (await f.Service.ApproveAsync(Guid.NewGuid(), OperationsAdmin, request.RequestType, request.Id,
            new ApproveChangeRequest { NewTutorId = request.CurrentTutorId }, None)).StatusCode);
        Assert.Equal(400, (await f.Service.ApproveAsync(Guid.NewGuid(), OperationsAdmin, request.RequestType, request.Id,
            new ApproveChangeRequest { NewTutorId = Guid.NewGuid() }, None)).StatusCode); // not in the eligible list
        var result = await f.Service.ApproveAsync(Guid.NewGuid(), OperationsAdmin, request.RequestType, request.Id,
            new ApproveChangeRequest { NewTutorId = noRate.TutorId }, None);
        Assert.Equal(400, result.StatusCode);
        Assert.Contains("rate", result.Message);
    }

    [Fact]
    public async Task ADecidedRequestCannotBeApprovedAgain()
    {
        var request = Request(status: AssignmentChangeRequestStatus.Reassigned);
        var f = ApprovalFixture(request);
        Assert.Equal(409, (await f.Service.ApproveAsync(Guid.NewGuid(), OperationsAdmin, request.RequestType, request.Id,
            new ApproveChangeRequest { NewTutorId = Guid.NewGuid() }, None)).StatusCode);
    }

    [Fact]
    public async Task AClashWithTheNewTutorsTimetableBlocksTheReassignment()
    {
        var request = Request();
        var tutor = new ReplacementTutorDto { TutorId = Guid.NewGuid(), UserId = Guid.NewGuid(), Name = "Dharnessh S", Rate = 300 };
        var f = ApprovalFixture(request, tutor);
        var session = new ChangeRequestSessionDto { ScheduleDetailsId = Guid.NewGuid(), StartTime = new(2026, 10, 27, 17, 0, 0), EndTime = new(2026, 10, 27, 18, 0, 0) };
        f.Repo.Stub.Handlers["GetFutureSessionsAsync"] = args =>
        {
            Assert.Equal(request.SalesDetailsId, args[0]);
            Assert.Equal(request.CurrentTutorId, args[1]);
            Assert.Equal(Now, args[2]);
            return Task.FromResult<IReadOnlyList<ChangeRequestSessionDto>>(new[] { session });
        };
        f.Schedules.Stub.Handlers["HasTutorScheduleConflictAsync"] = args =>
        {
            Assert.Equal(request.SalesDetailsId, args[3]); // the course's own classes are not a clash
            return Task.FromResult((Guid)args[0]! == tutor.UserId);
        };
        var result = await f.Service.ApproveAsync(Guid.NewGuid(), OperationsAdmin, request.RequestType, request.Id,
            new ApproveChangeRequest { NewTutorId = tutor.TutorId }, None);
        Assert.Equal(409, result.StatusCode);
        Assert.Contains("27 Oct 2026", result.Message);
        // ApproveAsync was never called, so nothing was reassigned.
    }

    [Fact]
    public async Task ApprovalReassignsWithTheCallerAsDeciderAndReportsMovedClasses()
    {
        var caller = Guid.NewGuid();
        var request = Request(owner: caller);
        var tutor = new ReplacementTutorDto { TutorId = Guid.NewGuid(), UserId = Guid.NewGuid(), Name = "Dharnessh S", Rate = 300 };
        var f = ApprovalFixture(request, tutor);
        f.Repo.Stub.Handlers["GetFutureSessionsAsync"] = _ => Task.FromResult<IReadOnlyList<ChangeRequestSessionDto>>(new[]
        {
            new ChangeRequestSessionDto { StartTime = new(2026, 10, 27, 17, 0, 0), EndTime = new(2026, 10, 27, 18, 0, 0) },
            new ChangeRequestSessionDto { StartTime = new(2026, 10, 29, 17, 0, 0), EndTime = new(2026, 10, 29, 18, 0, 0) },
        });
        f.Schedules.Stub.Handlers["HasTutorScheduleConflictAsync"] = _ => Task.FromResult(false);
        f.Repo.Stub.Handlers["ApproveAsync"] = args =>
        {
            Assert.Equal(request.Id, args[0]);
            Assert.Equal(tutor.TutorId, args[1]);
            Assert.Equal(caller, args[2]);
            Assert.Equal("Approved after call", args[3]);
            Assert.Equal(Now, args[4]);
            return Task.FromResult(ChangeRequestApproveOutcome.Ok(2));
        };
        var result = await f.Service.ApproveAsync(caller, Operations, request.RequestType, request.Id,
            new ApproveChangeRequest { NewTutorId = tutor.TutorId, Note = "Approved after call" }, None);
        Assert.True(result.Succeeded);
        Assert.Equal(2, result.Data);
        Assert.Contains("Dharnessh S", result.Message);
        Assert.Contains("2 upcoming classes moved", result.Message);
    }

    [Fact]
    public async Task ARepositoryConflictIsPassedThrough()
    {
        var request = Request();
        var tutor = new ReplacementTutorDto { TutorId = Guid.NewGuid(), UserId = Guid.NewGuid(), Name = "T", Rate = 1 };
        var f = ApprovalFixture(request, tutor);
        f.Repo.Stub.Handlers["GetFutureSessionsAsync"] = _ => Task.FromResult<IReadOnlyList<ChangeRequestSessionDto>>(Array.Empty<ChangeRequestSessionDto>());
        f.Repo.Stub.Handlers["ApproveAsync"] = _ => Task.FromResult(ChangeRequestApproveOutcome.Fail(409, "The course's tutor has changed since this request was raised. Reject this request instead."));
        var result = await f.Service.ApproveAsync(Guid.NewGuid(), OperationsAdmin, request.RequestType, request.Id,
            new ApproveChangeRequest { NewTutorId = tutor.TutorId }, None);
        Assert.Equal(409, result.StatusCode);
        Assert.Contains("tutor has changed", result.Message);
    }

    // ─── Rejection ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task RejectionNeedsAReasonAndChangesOnlyTheRequest()
    {
        var caller = Guid.NewGuid();
        var request = Request(owner: caller);
        var f = new Fixture();
        f.Repo.Stub.Handlers["GetRequestAsync"] = _ => Task.FromResult<ChangeRequestDto?>(request);
        Assert.Equal(400, (await f.Service.RejectAsync(caller, Operations, request.RequestType, request.Id, new RejectChangeRequest { Note = "  " }, None)).StatusCode);

        var rejectedWith = "";
        f.Repo.Stub.Handlers["RejectAsync"] = args => { rejectedWith = (string)args[2]!; return Task.FromResult(true); };
        var result = await f.Service.RejectAsync(caller, Operations, request.RequestType, request.Id, new RejectChangeRequest { Note = " Tutor is excellent " }, None);
        Assert.True(result.Succeeded);
        Assert.Equal("Tutor is excellent", rejectedWith);
        Assert.Contains("unchanged", result.Message);

        f.Repo.Stub.Handlers["RejectAsync"] = _ => Task.FromResult(false); // decided meanwhile
        Assert.Equal(409, (await f.Service.RejectAsync(caller, Operations, request.RequestType, request.Id, new RejectChangeRequest { Note = "late" }, None)).StatusCode);
    }
}
