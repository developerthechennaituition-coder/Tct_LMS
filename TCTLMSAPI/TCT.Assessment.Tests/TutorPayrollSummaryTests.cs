using TCT.LMS.Application.Services;

namespace TCT.Assessment.Tests;

public class TutorPayrollSummaryTests
{
    private readonly PayrollTutor tutor = new(Guid.NewGuid(), Guid.NewGuid(), "Tutor", "T001");
    private PayrollClass Class(bool completed = true, bool approved = true, decimal rate = 250, int minutes = 60) =>
        new(tutor.Id, Guid.NewGuid(), Guid.NewGuid(), new DateTime(2026,10,5), new DateTime(2026,10,5,10,0,0),
            new DateTime(2026,10,5,10,0,0).AddMinutes(minutes), rate, completed, approved, false);
    [Fact] public void IncludesTutorsWithNoClassesAndUsesLoginIdForGeneration()
    {
        var row = Assert.Single(TutorPayrollSummary.Build(new[] { tutor }, Array.Empty<PayrollClass>(), Array.Empty<PayrollInvoice>(), 10, 2026));
        Assert.Equal("No classes taken", row.PayrollStatus); Assert.Equal(0, row.TotalNoOfClasses);
        Assert.Equal(tutor.UserId, row.TutorId); Assert.False(row.IsInvoiceGenerated);
    }
    [Fact] public void LastMonthsInvoiceCannotMarkThisMonthProcessed()
    {
        var row = Assert.Single(TutorPayrollSummary.Build(new[] { tutor }, new[] { Class() },
            new[] { new PayrollInvoice(tutor.Id, "OLD", "September", 2026, 1000) }, 10, 2026));
        Assert.Equal("Pending", row.PayrollStatus); Assert.Null(row.InvoiceNumber); Assert.Equal(250m, row.TotalTutorPayment);
    }
    [Theory] [InlineData("10")] [InlineData("October")] [InlineData("october")]
    public void SelectedMonthInvoiceWinsAndUsesStoredAmount(string month)
    {
        var row = Assert.Single(TutorPayrollSummary.Build(new[] { tutor }, new[] { Class(rate: 900) },
            new[] { new PayrollInvoice(tutor.Id, "SAVED", month, 2026, 375) }, 10, 2026));
        Assert.Equal("Processed", row.PayrollStatus); Assert.Equal("SAVED", row.InvoiceNumber);
        Assert.Equal(375m, row.TotalTutorPayment);
    }
    [Fact] public void GroupsDifferentRatesIntoOneTutorAndOnlyPaysApprovedCompletedClasses()
    {
        var row = Assert.Single(TutorPayrollSummary.Build(new[] { tutor }, new[] {
            Class(rate: 250, minutes: 61), Class(rate: 300, minutes: 90), Class(approved: false), Class(completed: false)
        }, Array.Empty<PayrollInvoice>(), 10, 2026));
        Assert.Equal(4, row.TotalNoOfClasses); Assert.Equal(3, row.NoOfDaysPresent); Assert.Equal(2, row.Approved);
        Assert.Equal(762.50m, row.TotalTutorPayment);
    }
    [Fact] public void SameNameTutorsDoNotMergeAndOldYearsAreExcluded()
    {
        var other = new PayrollTutor(Guid.NewGuid(), Guid.NewGuid(), "Tutor", "T002");
        var rows = TutorPayrollSummary.Build(new[] { tutor, other }, new[] { Class() with { Date = new DateTime(2025,10,5) } },
            new[] { new PayrollInvoice(tutor.Id, "OLDYEAR", "10", 2025, 1000) }, 10, 2026);
        Assert.Equal(2, rows.Count); Assert.All(rows, r => Assert.Equal("No classes taken", r.PayrollStatus));
    }
    [Fact] public void SavedPayrollRemainsVisibleEvenWithoutCurrentClasses()
    {
        var row = Assert.Single(TutorPayrollSummary.Build(new[] { tutor }, Array.Empty<PayrollClass>(),
            new[] { new PayrollInvoice(tutor.Id, "SAVED", "10", 2026, 375) }, 10, 2026));
        Assert.Equal("Processed", row.PayrollStatus);
    }
    [Theory] [InlineData("09",9)] [InlineData("9",9)] [InlineData("September",9)]
    public void RecognizesExistingMonthFormats(string value, int month) => Assert.True(TutorPayrollSummary.MatchesMonth(value, month));
}
