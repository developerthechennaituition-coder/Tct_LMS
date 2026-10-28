using TCT.LMS.Application.Services;
using TCT.LMS.DTOs.Schedule;

namespace TCT.Assessment.Tests;

public class PackageBillingGuardTests
{
    [Theory]
    [InlineData(1, 10, 2026, 24)]
    [InlineData(3, 11, 2026, 24)]
    [InlineData(3, 10, 2027, 24)]
    [InlineData(3, 10, 2026, null)]
    [InlineData(3, 10, 2026, 0)]
    public void UnissuedPlanMustMatchScheduleAndHaveConfirmedCount(int months, int startMonth, int year, int? classes)
    {
        Assert.Throws<InvalidOperationException>(() => PackageBillingGuard.RequireScheduledAgreement(
            3, new DateTime(2026, 10, 15), months, startMonth, year, classes));
    }

    [Fact]
    public void MatchingPackageAgreementIsAllowed()
    {
        PackageBillingGuard.RequireScheduledAgreement(3, new DateTime(2026, 10, 15), 3, 10, 2026, 24);
    }

    [Theory]
    [InlineData("2026-10-15", 3, "2026-12-31")]
    [InlineData("2026-11-01", 3, "2027-01-31")]
    [InlineData("2028-02-10", 1, "2028-02-29")]
    [InlineData("2026-10-15", 10, "2027-07-31")]
    public void PackagePeriodIncludesTheStartMonth(string start, int months, string end)
    {
        Assert.Equal(DateTime.Parse(end), ScheduledPackagePeriod.EndDate(DateTime.Parse(start), months));
    }
    [Theory]
    [InlineData(2)] [InlineData(3)] [InlineData(10)]
    public void MultiMonthScheduleCannotSilentlyFallBackToMonthlyInvoice(int months)
    {
        var exception = Assert.Throws<InvalidOperationException>(() => PackageBillingGuard.RequireConfirmedPlans(new[] {
            new AccountsInvoiceSummaryDto { Subject = "Maths", ScheduledPackageMonths = months }
        }));
        Assert.Contains($"{months} months", exception.Message);
    }
    [Fact]
    public void ConfirmedPackageAndOrdinaryMonthlySubjectsRemainAllowed()
    {
        PackageBillingGuard.RequireConfirmedPlans(new[] {
            new AccountsInvoiceSummaryDto { Subject = "Maths", ScheduledPackageMonths = 3, PaymentPlanId = Guid.NewGuid(), PaymentPlanMonths = 3 },
            new AccountsInvoiceSummaryDto { Subject = "Science", ScheduledPackageMonths = 1 },
            new AccountsInvoiceSummaryDto { Subject = "English" }
        });
    }
    [Fact]
    public void AnyMissingPackageBlocksMixedInvoiceBeforeWriting()
    {
        Assert.Throws<InvalidOperationException>(() => PackageBillingGuard.RequireConfirmedPlans(new[] {
            new AccountsInvoiceSummaryDto { Subject = "Maths", ScheduledPackageMonths = 3, PaymentPlanId = Guid.NewGuid(), PaymentPlanMonths = 3 },
            new AccountsInvoiceSummaryDto { Subject = "Science", ScheduledPackageMonths = 3 }
        }));
    }
    [Fact]
    public void MismatchedUnissuedPlanCannotInvoiceWrongDuration()
    {
        Assert.Throws<InvalidOperationException>(() => PackageBillingGuard.RequireConfirmedPlans(new[] {
            new AccountsInvoiceSummaryDto { Subject = "Maths", ScheduledPackageMonths = 3, PaymentPlanId = Guid.NewGuid(), PaymentPlanMonths = 1 }
        }));
    }
}
