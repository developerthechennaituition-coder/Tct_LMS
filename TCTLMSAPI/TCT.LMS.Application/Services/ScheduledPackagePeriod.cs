namespace TCT.LMS.Application.Services;

public static class ScheduledPackagePeriod
{
    // The start month is month one: October + three months ends on December 31.
    public static DateTime EndDate(DateTime start, int months)
    {
        if (months < 1 || months > 10) throw new ArgumentOutOfRangeException(nameof(months));
        return new DateTime(start.Year, start.Month, 1).AddMonths(months).AddDays(-1);
    }
}
