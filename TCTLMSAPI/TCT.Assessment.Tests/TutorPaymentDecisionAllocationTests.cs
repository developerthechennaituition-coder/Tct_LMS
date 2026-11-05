using TCT.LMS.Application.Services;
using TCT.LMS.Domain.Entities;

namespace TCT.Assessment.Tests;

public class TutorPaymentDecisionAllocationTests
{
    private static readonly Guid SalesDetailsId = Guid.NewGuid();
    private static readonly Guid TutorId = Guid.NewGuid();

    private static TutorStudentAllocations Allocation(bool active, Guid? salesDetailsId = null, Guid? tutorId = null) => new()
    {
        Id = Guid.NewGuid(), SalesDetailsId = salesDetailsId ?? SalesDetailsId, TutorId = tutorId ?? TutorId,
        StudentId = Guid.NewGuid(), IsActive = active, Note = ""
    };

    [Fact]
    public void ReSavedAssignment_DecisionTargetsTheActiveAllocation()
    {
        var original = Allocation(active: false);   // the allocation the payment request was raised on
        var resaved = Allocation(active: false);
        var current = Allocation(active: true);

        var matches = new[] { original, resaved, current }.AsQueryable()
            .Where(TutorPaymentApprovalRules.IsCurrentAllocation(SalesDetailsId, TutorId)).ToList();

        Assert.Equal(new[] { current }, matches);
    }

    [Fact]
    public void OtherCourseOrTutorIsNeverTargeted()
    {
        var otherCourse = Allocation(active: true, salesDetailsId: Guid.NewGuid());
        var otherTutor = Allocation(active: true, tutorId: Guid.NewGuid());

        var matches = new[] { otherCourse, otherTutor }.AsQueryable()
            .Where(TutorPaymentApprovalRules.IsCurrentAllocation(SalesDetailsId, TutorId)).ToList();

        Assert.Empty(matches); // the controller then falls back to the request's stored allocation
    }
}
