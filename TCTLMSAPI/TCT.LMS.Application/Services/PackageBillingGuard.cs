using TCT.LMS.DTOs.Schedule;

namespace TCT.LMS.Application.Services;

public static class PackageBillingGuard
{
    public static void RequireScheduledAgreement(int scheduledMonths, DateTime scheduleStart,
        int planMonths, int planStartMonth, int planStartYear, int? includedClasses)
    {
        if (scheduledMonths <= 1) return;
        if (scheduledMonths != planMonths || scheduleStart.Month != planStartMonth || scheduleStart.Year != planStartYear)
            throw new InvalidOperationException($"This schedule requires a {scheduledMonths}-month package starting {scheduleStart:MMMM yyyy}. Review the unissued payment plan before invoicing.");
        if (!includedClasses.HasValue || includedClasses <= 0)
            throw new InvalidOperationException("Confirm the total included classes for the whole package; the initial month alone is not the package total.");
    }

    public static void RequireConfirmedPlans(IEnumerable<AccountsInvoiceSummaryDto> rows)
    {
        var missing = rows.FirstOrDefault(row => row.ScheduledPackageMonths > 1 &&
            (!row.PaymentPlanId.HasValue || row.PaymentPlanMonths != row.ScheduledPackageMonths));
        if (missing != null)
            throw new InvalidOperationException($"{missing.Subject} was scheduled for {missing.ScheduledPackageMonths} months. " +
                "Open Package Billing in Student Schedules and confirm the full-period fee and included class count before generating one package invoice. A monthly invoice has not been created.");
    }
}
