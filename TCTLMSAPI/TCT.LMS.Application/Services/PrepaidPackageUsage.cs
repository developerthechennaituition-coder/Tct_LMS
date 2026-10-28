namespace TCT.LMS.Application.Services;

public static class PrepaidPackageUsage
{
    // The entitlement is for the whole package, never a separate monthly quota.
    public static IReadOnlyList<T> ExtraClasses<T>(IEnumerable<T> chronologicalCompletedClasses, int includedClasses)
    {
        if (includedClasses <= 0) throw new ArgumentOutOfRangeException(nameof(includedClasses));
        return chronologicalCompletedClasses.Skip(includedClasses).ToList();
    }
    public static bool Exhausted(int completedClasses, int includedClasses) =>
        includedClasses > 0 && completedClasses >= includedClasses;
}
