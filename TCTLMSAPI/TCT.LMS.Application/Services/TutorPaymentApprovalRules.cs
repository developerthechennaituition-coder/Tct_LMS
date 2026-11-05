using System.Linq.Expressions;
using TCT.LMS.Domain;
using TCT.LMS.Domain.Entities;

namespace TCT.LMS.Application.Services;

/// <summary>
/// Keeps the Coordinator Admin assignment decision separate from the Super Admin payment decision
/// (TutorController.DecidePaymentApproval), and selects the payment percentage configuration that
/// gives a tutor's default payment.
/// </summary>
public static class TutorPaymentApprovalRules
{
    public const string PendingSuperAdminPaymentMessage =
        "This assignment has a tutor payment change awaiting Super Admin approval. " +
        "Please approve or reject the assignment after the Super Admin has decided on the payment.";

    // A payment change awaits Super Admin while its TutorPaymentApproval row for the course and tutor is
    // active and Pending; an ordinary assignment has no such row. Same filter as the existing lookup in
    // SalesRepository.UpdateSalesDetailsStatus.
    public static Expression<Func<TutorPaymentApproval, bool>> IsPendingSuperAdminRequest(Guid salesDetailsId, Guid tutorId) =>
        p => p.SalesDetailsId == salesDetailsId
             && p.TutorId == tutorId
             && p.IsActive
             && p.ApprovalStatus == (int)TutorPaymentStatus.Pending;

    // Re-saving an assignment replaces its allocation, so the request's stored TutorStudentAllocationId can be an inactive
    // one; the Super Admin decision applies to the course's current allocation for the tutor.
    public static Expression<Func<TutorStudentAllocations, bool>> IsCurrentAllocation(Guid salesDetailsId, Guid tutorId) =>
        a => a.SalesDetailsId == salesDetailsId && a.TutorId == tutorId && a.IsActive;

    // Coordinator Admin approval (20013) and rejection (20014) wait for the Super Admin payment decision.
    public static bool BlocksCoordinatorAdminDecision(int status, bool hasPendingSuperAdminRequest) =>
        hasPendingSuperAdminRequest
        && (status == (int)FollowUpStatus.DemoPendingTutorAssignedApproved || status == (int)FollowUpStatus.Reject);

    // Only active configurations apply. With duplicates for a board, grade and subject, the latest created
    // or (in)activated one wins (an edit does not set ModifiedDate).
    public static IQueryable<PaymentPercentageConfiguration> CurrentConfiguration(
        IQueryable<PaymentPercentageConfiguration> source, Guid boardId, Guid gradeId, Guid subjectId) =>
        source.Where(x => x.Board == boardId && x.Grade == gradeId && x.Subject == subjectId && x.IsActive)
              .OrderByDescending(x => x.ModifiedDate ?? x.CreatedDate);
}
