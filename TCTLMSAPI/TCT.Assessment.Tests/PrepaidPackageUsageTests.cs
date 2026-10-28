using TCT.LMS.Application.Services;

namespace TCT.Assessment.Tests;

public class PrepaidPackageUsageTests
{
    [Fact] public void TenClassesInFirstMonthOf24ClassPackageHasNoExtras()
    {
        Assert.Empty(PrepaidPackageUsage.ExtraClasses(Enumerable.Range(1, 10), 24));
        Assert.False(PrepaidPackageUsage.Exhausted(10, 24));
    }
    [Fact] public void All24ClassesInTwoMonthsExhaustsThePackageWithoutExtraCharge()
    {
        Assert.Empty(PrepaidPackageUsage.ExtraClasses(Enumerable.Range(1, 24), 24));
        Assert.True(PrepaidPackageUsage.Exhausted(24, 24));
    }
    [Fact] public void OnlyCompletedClassesBeyondTheTotalAreExtras()
    {
        Assert.Equal(new[] { 25, 26 }, PrepaidPackageUsage.ExtraClasses(Enumerable.Range(1, 26), 24));
    }
    [Fact] public void PreviouslyBilledExtrasAreNotBilledAgain()
    {
        var billed = new HashSet<int> { 25 };
        var extras = PrepaidPackageUsage.ExtraClasses(Enumerable.Range(1, 26), 24).Where(id => !billed.Contains(id));
        Assert.Equal(new[] { 26 }, extras);
    }
    [Fact] public void MissingEntitlementFailsClosed()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => PrepaidPackageUsage.ExtraClasses(Array.Empty<int>(), 0));
    }
}
