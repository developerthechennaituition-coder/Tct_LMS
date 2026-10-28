using Common;
using Microsoft.EntityFrameworkCore;
using TCT.LMS.Application.Services;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Payment;
using TCT.LMS.Infrastructure.Common;

namespace TCT.LMS.Infrastructure.Repositories;

public partial class ScheduleRepository
{
    private async Task<List<ScheduleDetails>> GetPackageCompletedClassesAsync(StudentPaymentPlan plan)
    {
        var start = new DateTime(plan.StartYear, plan.StartMonth, 1);
        var end = start.AddMonths(plan.PlanMonths);
        var completedIds = await GetClassCompletedStatusIdsAsync();
        var operationCompletedIds = completedIds.Union(await GetOpsApprovedStatusIdsAsync()).ToHashSet();
        // Operations' explicit outcome takes precedence over a tutor's earlier submission.
        // Only use the legacy text when neither role has submitted a status.
        return await (from schedule in _dbContext.Schedule.AsNoTracking()
                      join detail in _dbContext.ScheduleDetails.AsNoTracking() on schedule.ScheduleId equals detail.ScheduleId
                      where schedule.SalesDetailsId == plan.SalesDetailsId && schedule.IsActive && detail.IsActive
                         && detail.ScheduleType == "Class" && detail.Date >= start && detail.Date < end
                         && (detail.OperationScheduleStatus.HasValue && operationCompletedIds.Contains(detail.OperationScheduleStatus.Value)
                             || !detail.OperationScheduleStatus.HasValue && detail.TutorScheduleStatus.HasValue && completedIds.Contains(detail.TutorScheduleStatus.Value)
                             || !detail.OperationScheduleStatus.HasValue && !detail.TutorScheduleStatus.HasValue && detail.Status == "Class Completed")
                      orderby detail.Date, detail.StartTime, detail.ScheduleDetailsId
                      select detail).ToListAsync();
    }

    private async Task<decimal> GetPackageExtraChargesAsync(Guid planId) =>
        await _dbContext.PrepaidClassCharge.Where(c => c.StudentPaymentPlanId == planId)
            .SumAsync(c => (decimal?)c.Amount) ?? 0m;

    private async Task<string?> GetPackageBlockReasonAsync(StudentPaymentPlan plan)
    {
        if (string.IsNullOrWhiteSpace(plan.UpfrontInvoiceNumber))
            return plan.IsBlocked ? "This payment plan is blocked. Contact Accounts." : null;
        if (!plan.TotalClasses.HasValue || plan.TotalClasses <= 0)
            return "Accounts must confirm the included class count for this previously invoiced package.";
        var completed = await GetPackageCompletedClassesAsync(plan);
        var extras = await GetPackageExtraChargesAsync(plan.Id);
        var paid = await _dbContext.StudentPayment.Where(p => p.StudentPaymentPlanId == plan.Id && p.IsActive)
            .SumAsync(p => (decimal?)p.Amount) ?? 0m;
        if (extras > 0 && paid < plan.TotalFee + extras)
            return "Extra-class charges are unpaid. Accounts must record payment before further classes.";
        if (PrepaidPackageUsage.Exhausted(completed.Count, plan.TotalClasses.Value))
            return $"All {plan.TotalClasses.Value} package classes have been used. A new approved package is required before further classes.";
        return plan.IsBlocked ? "This payment plan is blocked. Contact Accounts." : null;
    }

    public async Task<string?> GetPrepaidScheduleBlockReasonAsync(Guid salesDetailsId, DateTime classDate)
    {
        var plans = await _dbContext.StudentPaymentPlan.AsNoTracking()
            .Where(p => p.SalesDetailsId == salesDetailsId && p.IsActive).ToListAsync();
        foreach (var plan in plans)
        {
            var start = new DateTime(plan.StartYear, plan.StartMonth, 1);
            if (classDate.Date < start) continue;
            if (classDate.Date >= start.AddMonths(plan.PlanMonths) && !string.IsNullOrWhiteSpace(plan.UpfrontInvoiceNumber))
                return "This package has ended. Accounts must approve a new package before further classes.";
            var reason = await GetPackageBlockReasonAsync(plan);
            if (reason != null) return reason;
        }
        return null;
    }

    private async Task<string?> GetPrepaidCompletionBlockReasonAsync(ScheduleDetails detail)
    {
        if (detail.ScheduleType != "Class") return null;
        var enrollmentId = await _dbContext.Schedule.Where(s => s.ScheduleId == detail.ScheduleId)
            .Select(s => s.SalesDetailsId).FirstAsync();
        var plans = await _dbContext.StudentPaymentPlan.AsNoTracking()
            .Where(p => p.SalesDetailsId == enrollmentId && p.IsActive).ToListAsync();
        foreach (var plan in plans)
        {
            // Allow the other roles to finish recording/approving an already-counted class.
            var completed = await GetPackageCompletedClassesAsync(plan);
            if (completed.Any(c => c.ScheduleDetailsId == detail.ScheduleDetailsId)) continue;
            var reason = await GetPrepaidScheduleBlockReasonAsync(enrollmentId, detail.Date);
            if (reason != null) return reason;
        }
        return null;
    }

    // A credit check no longer bills FUTURE classes or turns payment into extra entitlement.
    // Payable invoices are created only by the monthly reconciliation of completed extras.
    public async Task<List<OverrunResultDto>> DetectAndRaiseOverrunAsync(Guid studentId, Guid createdBy)
    {
        var plans = await _dbContext.StudentPaymentPlan.Where(p => p.StudentId == studentId && p.IsActive).ToListAsync();
        foreach (var plan in plans)
        {
            if (await GetPackageBlockReasonAsync(plan) == null) continue;
            plan.IsBlocked = true;
            plan.BlockedDate ??= DateTime.Now;
            plan.ModifiedBy = createdBy;
            plan.ModifiedDate = DateTime.Now;
        }
        await _dbContext.SaveChangesAsync();
        return new List<OverrunResultDto>();
    }

    public async Task<string> CreatePrepaidStatementInvoiceAsync(Guid studentId, int month, int year, Guid createdBy)
    {
        if (month < 1 || month > 12 || year < 2000 || year > 9988)
            throw new InvalidOperationException("Select a valid invoice month and year.");
        var monthStart = new DateTime(year, month, 1);
        var monthEnd = monthStart.AddMonths(1);
        if (monthStart > DateHelper.TCTConvertTimeFromUtc(DateTime.UtcNow).Date)
            throw new InvalidOperationException("A future month cannot be reconciled before classes have taken place.");

        string invoiceNumber;
        using (var tx = await _dbContext.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable))
        {
            var plans = (await _dbContext.StudentPaymentPlan.Where(p => p.StudentId == studentId && p.IsActive).ToListAsync())
                .Where(p => monthStart >= new DateTime(p.StartYear, p.StartMonth, 1)
                    && monthStart < new DateTime(p.StartYear, p.StartMonth, 1).AddMonths(p.PlanMonths)).ToList();
            if (plans.Count == 0) throw new InvalidOperationException("No prepaid package covers this month.");
            if (plans.Any(p => string.IsNullOrWhiteSpace(p.UpfrontInvoiceNumber) || !p.TotalClasses.HasValue || p.TotalClasses <= 0))
                throw new InvalidOperationException("Create the upfront invoice with a confirmed included class count before monthly reconciliation.");
            var identity = await (from student in _dbContext.Student
                                  join user in _dbContext.User on student.UserId equals user.Id
                                  where student.Id == studentId
                                  select new { UserId = user.Id, Name = user.FirstName + " " + user.LastName, student.ParentName }).SingleAsync();
            var lines = new List<StudentInvoiceDetails>();
            var charges = new List<PrepaidClassCharge>();
            var now = DateTime.Now;
            foreach (var plan in plans)
            {
                var completed = await GetPackageCompletedClassesAsync(plan);
                var completedIds = completed.Select(c => c.ScheduleDetailsId).ToList();
                var billedIds = await _dbContext.PrepaidClassCharge.Where(c => completedIds.Contains(c.ScheduleDetailsId))
                    .Select(c => c.ScheduleDetailsId).ToListAsync();
                var extras = PrepaidPackageUsage.ExtraClasses(completed, plan.TotalClasses!.Value)
                    .Where(c => c.Date >= monthStart && c.Date < monthEnd && !billedIds.Contains(c.ScheduleDetailsId)).ToList();
                if (extras.Count > 0)
                {
                    var scheduleIds = extras.Select(c => c.ScheduleId).Distinct().ToList();
                    var approved = await _dbContext.Type_Code.Where(code => code.TypeCodeValue == 1014001).Select(code => code.Id).FirstOrDefaultAsync();
                    if (approved == Guid.Empty || await _dbContext.Schedule.AnyAsync(s => scheduleIds.Contains(s.ScheduleId) && s.AccountsApprovalScheduleStatus != approved))
                        throw new InvalidOperationException("Accounts must approve the completed extra classes before invoicing them.");
                }
                var info = await (from schedule in _dbContext.Schedule
                                  join enrollment in _dbContext.SalesDetails on schedule.SalesDetailsId equals enrollment.Id
                                  join sale in _dbContext.Sales on enrollment.SalesId equals sale.Id
                                  join subject in _dbContext.Type_Code on enrollment.SubjectId equals subject.Id
                                  join grade in _dbContext.Type_Code on sale.GradeId equals grade.Id
                                  join board in _dbContext.Type_Code on sale.BoardId equals board.Id
                                  where schedule.SalesDetailsId == plan.SalesDetailsId && schedule.IsActive
                                  select new { schedule.ScheduleId, schedule.TutorId, enrollment.ParentPayment,
                                      Subject = subject.TypeCodeName, Grade = grade.TypeCodeName, Board = board.TypeCodeName }).FirstOrDefaultAsync();
                if (info == null) throw new InvalidOperationException("A package subject has no active schedule.");
                if (extras.Count > 0 && info.ParentPayment <= 0)
                    throw new InvalidOperationException("Set a positive agreed hourly rate before invoicing extra classes.");
                decimal amount = 0;
                foreach (var extra in extras)
                {
                    // Existing tuition pricing uses the scheduled duration rounded to 15 minutes.
                    var minutes = (extra.EndTime - extra.StartTime).TotalMinutes;
                    if (minutes <= 0) throw new InvalidOperationException("An extra class has invalid start/end times.");
                    var charge = decimal.Round((decimal)Math.Ceiling(minutes / 15d) / 4m * info.ParentPayment, 2, MidpointRounding.AwayFromZero);
                    amount += charge;
                    charges.Add(new PrepaidClassCharge { Id = Guid.NewGuid(), StudentPaymentPlanId = plan.Id,
                        ScheduleDetailsId = extra.ScheduleDetailsId, Amount = charge, CreatedDate = DateTime.UtcNow });
                }
                lines.Add(new StudentInvoiceDetails { UserId = identity.UserId, StudentId = studentId, ScheduleId = info.ScheduleId,
                    StudentName = identity.Name, ParentName = identity.ParentName, TutorId = info.TutorId, TutorName = "",
                    Subject = info.Subject, Grade = info.Grade, Board = info.Board, ParentPayment = info.ParentPayment,
                    NumberOfClasses = extras.Count, SubjectAmount = amount, ScheduleType = "Class", Month = month, Year = year,
                    IsActive = true, CreatedBy = createdBy, CreatedDate = now });
            }
            var previous = await _dbContext.StudentInvoice.Where(i => i.StudentId == studentId && i.Month == month && i.Year == year
                && i.IsActive && i.InvoiceType == "Reconciliation").OrderByDescending(i => i.Id).FirstOrDefaultAsync();
            if (charges.Count == 0 && previous != null)
            {
                invoiceNumber = previous.InvoiceNumber;
            }
            else
            {
                // Later-arriving approved attendance produces a supplemental invoice, never edits an issued one.
                invoiceNumber = $"RECON-{year}{month:00}-{Guid.NewGuid():N}";
                var invoice = new StudentInvoice { StudentId = studentId, ScheduleId = lines[0].ScheduleId,
                    InvoiceNumber = invoiceNumber, InvoiceType = "Reconciliation", Month = month, Year = year,
                    TotalInvoiceAmount = lines.Sum(l => l.SubjectAmount ?? 0m), StartDate = now, DueDate = now,
                    IsActive = true, CreatedBy = createdBy, CreatedDate = now };
                _dbContext.StudentInvoice.Add(invoice);
                await _dbContext.SaveChangesAsync();
                foreach (var line in lines) { line.StudentInvoiceId = invoice.Id; _dbContext.StudentInvoiceDetails.Add(line); }
                foreach (var charge in charges) { charge.StudentInvoiceId = invoice.Id; _dbContext.PrepaidClassCharge.Add(charge); }
                foreach (var plan in plans.Where(p => charges.Any(c => c.StudentPaymentPlanId == p.Id)))
                {
                    plan.IsBlocked = true; plan.BlockedDate = now; plan.BalanceInvoiceNumber = invoiceNumber;
                }
                await _dbContext.SaveChangesAsync();
            }
            await tx.CommitAsync();
        }
        var unsent = await _dbContext.StudentInvoice.Where(i => i.StudentId == studentId && i.IsActive
            && i.InvoiceType == "Reconciliation" && i.TotalInvoiceAmount > 0 && i.EmailSentDate == null)
            .OrderBy(i => i.Id).Select(i => i.InvoiceNumber).ToListAsync();
        foreach (var pendingNumber in unsent) await SendReconciliationEmailAsync(pendingNumber);
        return invoiceNumber;
    }

    private async Task SendReconciliationEmailAsync(string invoiceNumber)
    {
        var invoice = await _dbContext.StudentInvoice.SingleAsync(i => i.InvoiceNumber == invoiceNumber);
        if (invoice.TotalInvoiceAmount <= 0 || invoice.EmailSentDate.HasValue) return;
        var identity = await (from student in _dbContext.Student join user in _dbContext.User on student.UserId equals user.Id
                              where student.Id == invoice.StudentId select new { user.Email, Name = user.FirstName + " " + user.LastName, student.ParentName }).SingleAsync();
        if (string.IsNullOrWhiteSpace(identity.Email))
            throw new InvalidOperationException($"Invoice {invoiceNumber} was saved, but the student's email is missing. Add the email and retry; the invoice will not be duplicated.");
        var lines = await _dbContext.StudentInvoiceDetails.Where(d => d.StudentInvoiceId == invoice.Id).ToListAsync();
        try
        {
            await _emailService.SendInvoiceWithPdfAsync(new InvoiceEmailData {
                ThrowOnFailure = true,
                ToEmail = identity.Email, StudentName = identity.Name, ParentName = identity.ParentName ?? identity.Name,
                InvoiceNumber = invoiceNumber, MonthYear = $"{new DateTime(invoice.Year, invoice.Month, 1):MMMM yyyy} — extra classes",
                TotalAmount = invoice.TotalInvoiceAmount, DueDate = invoice.DueDate ?? DateTime.Now,
                Grade = lines.First().Grade ?? "", Board = lines.First().Board ?? "",
                LineItems = lines.Select(l => new InvoiceLineItem { Subject = l.Subject ?? "", TutorName = l.TutorName ?? "",
                    NumberOfClasses = l.NumberOfClasses, ParentPayment = l.ParentPayment, TotalAmount = l.SubjectAmount ?? 0m,
                    StartDate = new DateTime(invoice.Year, invoice.Month, 1).ToString("dd-MMM-yyyy") }).ToList()
            });
            invoice.EmailSentDate = DateTime.Now;
            await _dbContext.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Invoice {invoiceNumber} was saved but email delivery failed. Retry the monthly check to resend without duplicate charges.", ex);
        }
    }
}
