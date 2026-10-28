using System.Globalization;
using TCT.LMS.DTOs.Payroll;

namespace TCT.LMS.Application.Services;

public record PayrollTutor(Guid Id, Guid UserId, string Name, string Code);
public record PayrollClass(Guid TutorId, Guid ScheduleId, Guid Id, DateTime Date,
    DateTime Start, DateTime End, decimal Rate, bool Completed, bool Approved, bool Cancelled);
public record PayrollInvoice(Guid TutorId, string Number, string Month, int Year, decimal Amount);

public static class TutorPayrollSummary
{
    public static bool MatchesMonth(string value, int month) =>
        int.TryParse(value, out var numeric) ? numeric == month :
        string.Equals(value?.Trim(), CultureInfo.InvariantCulture.DateTimeFormat.GetMonthName(month), StringComparison.OrdinalIgnoreCase);

    // Match the payslip procedure: scheduled duration rounded up to 15 minutes, at tutor hourly rate.
    public static decimal ClassAmount(DateTime start, DateTime end, decimal rate) =>
        Math.Max(0m, Math.Ceiling((decimal)(end.TruncateMinute() - start.TruncateMinute()).TotalMinutes / 15m)) / 4m * rate;

    private static DateTime TruncateMinute(this DateTime value) => value.AddTicks(-(value.Ticks % TimeSpan.TicksPerMinute));

    public static List<PayrollRequestDto> Build(IEnumerable<PayrollTutor> tutors, IEnumerable<PayrollClass> classes,
        IEnumerable<PayrollInvoice> invoices, int month, int year)
    {
        var byTutor = classes.Where(c => c.Date.Month == month && c.Date.Year == year).ToLookup(c => c.TutorId);
        var byInvoice = invoices.Where(i => i.Year == year && MatchesMonth(i.Month, month)).ToLookup(i => i.TutorId);
        return tutors.Select(tutor => {
            var rows = byTutor[tutor.Id].DistinctBy(c => c.Id).ToList();
            var issued = byInvoice[tutor.Id].DistinctBy(i => i.Number).ToList();
            var completed = rows.Count(c => c.Completed);
            var approved = rows.Count(c => c.Completed && c.Approved);
            return new PayrollRequestDto {
                TutorId = tutor.UserId, TutorName = tutor.Name, UserCode = tutor.Code,
                ScheduleId = rows.FirstOrDefault()?.ScheduleId,
                ScheduleMonth = month, ScheduleYear = year,
                ScheduleMonthName = CultureInfo.InvariantCulture.DateTimeFormat.GetMonthName(month),
                TotalNoOfClasses = rows.Count, NoOfDaysPresent = completed,
                NoOfDaysAbsent = rows.Count(c => c.Cancelled), Approved = approved,
                TotalTutorPayment = issued.Count > 0 ? issued.Sum(i => i.Amount) :
                    Math.Round(rows.Where(c => c.Completed && c.Approved).Sum(c => ClassAmount(c.Start, c.End, c.Rate)), 2, MidpointRounding.AwayFromZero),
                IsInvoiceGenerated = issued.Count > 0,
                InvoiceNumber = issued.FirstOrDefault()?.Number,
                InvoiceNumbers = issued.Select(i => i.Number).ToList(),
                PayrollStatus = issued.Count > 0 ? "Processed" : completed == 0 ? "No classes taken" : "Pending"
            };
        }).OrderBy(r => r.TutorName).ToList();
    }
}
