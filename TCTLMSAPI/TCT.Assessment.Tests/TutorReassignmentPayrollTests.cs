using TCT.LMS.Application.Services;
using TCT.LMS.Domain.Entities;

namespace TCT.Assessment.Tests;

// Payroll safety of the Tutor Change / Student Change approval: which sessions move and which rate pays them.
public class TutorReassignmentPayrollTests
{
    private static readonly DateTime Approval = new(2026, 10, 24, 13, 0, 0);
    private static readonly Guid ClassScheduled = Guid.NewGuid(), DemoScheduled = Guid.NewGuid(), Marked = Guid.NewGuid();
    private static readonly IReadOnlySet<Guid> Placeholders = new HashSet<Guid> { ClassScheduled, DemoScheduled };
    private static readonly IReadOnlySet<Guid> NoSlips = new HashSet<Guid>();

    private static ScheduleDetails Session(int daysFromApproval, Action<ScheduleDetails>? mark = null)
    {
        var start = Approval.AddDays(daysFromApproval).AddHours(3);
        var session = new ScheduleDetails { ScheduleDetailsId = Guid.NewGuid(), StartTime = start, EndTime = start.AddHours(1),
            Date = start.Date, TutorScheduleStatus = ClassScheduled, StudentScheduleStatus = ClassScheduled };
        mark?.Invoke(session);
        return session;
    }

    private static bool Moves(ScheduleDetails session, IReadOnlySet<Guid>? slips = null) =>
        TutorReassignmentRules.IsMovable(session, Approval, Placeholders, slips ?? NoSlips);

    [Fact] public void PastSessionsStayWithTheOriginalTutor()
    {
        Assert.False(Moves(Session(-3)));
        Assert.False(Moves(new ScheduleDetails { ScheduleDetailsId = Guid.NewGuid(), StartTime = Approval })); // exactly at approval
    }

    [Fact] public void EligibleUnmarkedFutureSessionsMove()
    {
        Assert.True(Moves(Session(2)));
        Assert.True(Moves(Session(2, s => { s.TutorScheduleStatus = DemoScheduled; s.StudentScheduleStatus = null; })));
    }

    [Theory]
    [InlineData("status")] [InlineData("tutorStatus")] [InlineData("studentStatus")] [InlineData("tutorTime")]
    [InlineData("studentTime")] [InlineData("tutorPresent")] [InlineData("studentPresent")]
    public void FutureSessionsWithAttendanceStayWithTheOriginalTutor(string field)
    {
        var session = Session(2, s =>
        {
            switch (field)
            {
                case "status": s.Status = "Class Completed"; break;
                case "tutorStatus": s.TutorScheduleStatus = Marked; break;
                case "studentStatus": s.StudentScheduleStatus = Marked; break;
                case "tutorTime": s.TutorStartTime = s.StartTime; break;
                case "studentTime": s.StudentEndTime = s.EndTime; break;
                case "tutorPresent": s.IsTutorPresent = false; break;
                case "studentPresent": s.IsStudentPresent = true; break;
            }
        });
        Assert.False(Moves(session));
    }

    [Fact] public void FutureSessionsWithOperationsStatusStayWithTheOriginalTutor()
    {
        Assert.False(Moves(Session(2, s => s.OperationScheduleStatus = Marked)));
        Assert.False(Moves(Session(2, s => s.OperationStartTime = s.StartTime)));
    }

    [Fact] public void SessionsAlreadyOnAPaySlipStayWithTheOriginalTutor()
    {
        var paid = Session(2);
        Assert.False(Moves(paid, new HashSet<Guid> { paid.ScheduleDetailsId }));
        Assert.True(Moves(Session(2), new HashSet<Guid> { paid.ScheduleDetailsId }));
    }

    [Fact] public void ReproducedCaseOnlyUnheldClassesMoveSoNothingIsPaidTwice()
    {
        // 17/19 Oct past and paid; 24/26/31 Oct marked in advance, approved and on the same slip; later classes unmarked.
        Action<ScheduleDetails> approved = s => { s.Status = "Class Completed"; s.OperationScheduleStatus = Marked; s.IsTutorPresent = true; };
        var sessions = new[] { Session(-7, approved), Session(-5, approved), Session(0, approved), Session(2, approved),
            Session(7, approved), Session(9), Session(11), Session(14) };
        var slip = sessions.Take(5).Select(s => s.ScheduleDetailsId).ToHashSet();

        var movable = sessions.Where(s => Moves(s, slip)).ToList();

        Assert.Equal(sessions.Skip(5), movable);
        Assert.DoesNotContain(movable, s => slip.Contains(s.ScheduleDetailsId));
    }

    [Fact] public void RepeatedReassignmentCannotMoveSessionsThatWereHeldOrPaidAfterTheFirst()
    {
        var after = Session(5);
        Assert.True(Moves(after)); // moved by the first approval
        after.Status = "Class Completed"; after.OperationScheduleStatus = Marked;
        var paid = new HashSet<Guid> { after.ScheduleDetailsId };
        Assert.False(TutorReassignmentRules.IsMovable(after, Approval.AddDays(1), Placeholders, paid)); // a later approval
    }

    [Fact] public void PreviewAndReassignmentUseTheSameRuleSoTheCountsMatch()
    {
        var sessions = new[] { Session(-1), Session(1), Session(2, s => s.Status = "Class Cancelled"), Session(3), Session(4, s => s.OperationScheduleStatus = Marked) };
        var slip = new HashSet<Guid> { sessions[3].ScheduleDetailsId };
        // Preview: sessions after the approval time that pass the rule.
        var preview = sessions.Where(s => s.StartTime > Approval).Count(s => Moves(s, slip));
        // Reassignment: every session of the schedule split by the rule.
        var moved = sessions.Count(s => Moves(s, slip));
        Assert.Equal(1, preview);
        Assert.Equal(preview, moved);
    }

    [Fact] public void WhenNoSessionHasBeenHeldEverySessionMovesSoTheWholeScheduleIsReassigned()
    {
        var sessions = new[] { Session(1), Session(3), Session(5) };
        Assert.All(sessions, s => Assert.True(Moves(s)));
        Assert.Empty(sessions.Where(s => !Moves(s))); // nothing stays: the existing whole-schedule switch applies
    }

    [Fact] public void SplitGivesTheOriginalScheduleTheOriginalRateAndTheReplacementTheConfiguredRate()
    {
        Assert.Equal((9m, 800m), TutorReassignmentRules.SplitRates(null, 9m, 800m));
        // An original schedule that already stores a rate (an earlier reassignment) keeps it.
        Assert.Equal((90m, 800m), TutorReassignmentRules.SplitRates(90m, 100m, 800m));
    }

    [Fact] public void NullScheduleRateFallsBackToTheCourseRate()
    {
        Assert.Equal(250m, TutorReassignmentRules.PayRate(null, 250m));
        Assert.Equal(9m, TutorReassignmentRules.PayRate(9m, 800m));
    }

    [Fact] public void PayrollIsUnchangedForSchedulesWithoutAStoredRate()
    {
        var tutor = new PayrollTutor(Guid.NewGuid(), Guid.NewGuid(), "Tutor", "T001");
        PayrollClass Class(decimal rate, int minutes) => new(tutor.Id, Guid.NewGuid(), Guid.NewGuid(), new DateTime(2026, 10, 5),
            new DateTime(2026, 10, 5, 10, 0, 0), new DateTime(2026, 10, 5, 10, 0, 0).AddMinutes(minutes), rate, true, true, false);
        var before = TutorPayrollSummary.Build(new[] { tutor }, new[] { Class(250, 61), Class(300, 90) }, Array.Empty<PayrollInvoice>(), 10, 2026);
        var after = TutorPayrollSummary.Build(new[] { tutor },
            new[] { Class(TutorReassignmentRules.PayRate(null, 250), 61), Class(TutorReassignmentRules.PayRate(null, 300), 90) },
            Array.Empty<PayrollInvoice>(), 10, 2026);
        Assert.Equal(762.50m, before.Single().TotalTutorPayment);
        Assert.Equal(before.Single().TotalTutorPayment, after.Single().TotalTutorPayment);
    }

    // Older coordinator Assign / Change Tutor: refused only while unheld class sessions would be left with the old tutor.
    [Fact] public void OlderTutorChangeIsBlockedWhileAnUnheldFutureClassRemains()
    {
        Assert.True(TutorReassignmentRules.HasUnheldSessions(new[] { Session(-2), Session(3) }, Approval, Placeholders, NoSlips));
    }

    [Fact] public void OlderTutorChangeIsAllowedWhenOnlyHistoricalMarkedOrPaidClassesRemain()
    {
        var paid = Session(4);
        var sessions = new[] { Session(-5), Session(-1, s => s.Status = "Class Completed"),
            Session(2, s => s.OperationScheduleStatus = Marked), Session(3, s => s.IsTutorPresent = true), paid };
        Assert.False(TutorReassignmentRules.HasUnheldSessions(sessions, Approval, Placeholders, new HashSet<Guid> { paid.ScheduleDetailsId }));
        Assert.False(TutorReassignmentRules.HasUnheldSessions(Array.Empty<ScheduleDetails>(), Approval, Placeholders, NoSlips));
    }

    [Fact] public void OlderTutorChangeRefusalPointsToTheTutorChangeRequest()
    {
        Assert.Contains("Tutor Change request", TutorReassignmentRules.OlderTutorChangeBlockedMessage);
    }

    [Fact] public void HistoricalUnpaidClassesKeepTheOriginalTutorsRateAfterTheCourseRateChanges()
    {
        var tutor = new PayrollTutor(Guid.NewGuid(), Guid.NewGuid(), "Abhay", "T001");
        var (originalRate, _) = TutorReassignmentRules.SplitRates(null, 9m, 800m);
        const decimal courseRateAfterChange = 800m;
        var past = new PayrollClass(tutor.Id, Guid.NewGuid(), Guid.NewGuid(), new DateTime(2026, 10, 17),
            new DateTime(2026, 10, 17, 16, 0, 0), new DateTime(2026, 10, 17, 17, 0, 0),
            TutorReassignmentRules.PayRate(originalRate, courseRateAfterChange), true, true, false);
        Assert.Equal(9m, TutorPayrollSummary.Build(new[] { tutor }, new[] { past }, Array.Empty<PayrollInvoice>(), 10, 2026).Single().TotalTutorPayment);
    }
}
