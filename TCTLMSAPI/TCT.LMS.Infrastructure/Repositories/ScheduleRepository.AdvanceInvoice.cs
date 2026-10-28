using Microsoft.EntityFrameworkCore;
using Stripe;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Invoice;
using TCT.LMS.Infrastructure.Common;

namespace TCT.LMS.Infrastructure.Repositories;

// Advance invoice: when a subject's regular classes are scheduled for the first time after its demo, the parent
// is billed in advance for that first month's scheduled classes (class hours x the subject's parent rate).
// It replaces the month-end invoice for that subject and month (CreateInvoiceWithDetailsAsync skips it) and is
// created unsent: Accounts send it to the parent, which adds the payment link and emails it.
public partial class ScheduleRepository
{
    public const string AdvanceInvoiceType = "Advance";

    // Returns the new invoice number, or null when this is not the subject's first regular schedule
    // (or it is prepaid / has no rate / was billed before).
    public async Task<string?> CreateAdvanceInvoiceIfFirstClassesAsync(Guid scheduleId, Guid createdBy)
    {
        var schedule = await _dbContext.Schedule.AsNoTracking().FirstOrDefaultAsync(s => s.ScheduleId == scheduleId && s.IsActive);
        if (schedule == null) return null;

        var classes = await _dbContext.ScheduleDetails.AsNoTracking()
            .Where(d => d.ScheduleId == scheduleId && d.IsActive && d.ScheduleType == "Class")
            .ToListAsync();
        if (classes.Count == 0) return null;

        // First regular classes for this subject: no other schedule of it has regular classes, and it was never invoiced.
        var otherSchedules = await _dbContext.Schedule.AsNoTracking()
            .Where(s => s.SalesDetailsId == schedule.SalesDetailsId && s.ScheduleId != scheduleId)
            .Select(s => s.ScheduleId).ToListAsync();
        var hadClassesBefore = await _dbContext.ScheduleDetails.AnyAsync(d => otherSchedules.Contains(d.ScheduleId)
            && d.IsActive && d.ScheduleType == "Class");
        if (hadClassesBefore) return null;
        var subjectSchedules = otherSchedules.Append(scheduleId).ToList();
        if (await _dbContext.Set<StudentInvoiceDetails>().AnyAsync(d => subjectSchedules.Contains(d.ScheduleId) && d.IsActive))
            return null;

        var firstDate = classes.Min(c => c.Date).Date;
        var month = firstDate.Month;
        var year = firstDate.Year;

        // Prepaid subjects are billed by their own upfront invoice.
        var invoiceMonth = new DateTime(year, month, 1);
        var prepaid = (await _dbContext.StudentPaymentPlan.AsNoTracking()
                .Where(p => p.SalesDetailsId == schedule.SalesDetailsId && p.IsActive).ToListAsync())
            .Any(p => invoiceMonth >= new DateTime(p.StartYear, p.StartMonth, 1)
                && invoiceMonth < new DateTime(p.StartYear, p.StartMonth, 1).AddMonths(p.PlanMonths));
        if (prepaid) return null;

        var salesDetails = await _dbContext.SalesDetails.AsNoTracking().FirstOrDefaultAsync(s => s.Id == schedule.SalesDetailsId);
        if (salesDetails == null || salesDetails.ParentPayment <= 0) return null;
        var sales = await _dbContext.Sales.AsNoTracking().FirstOrDefaultAsync(s => s.Id == salesDetails.SalesId);
        var student = await _dbContext.Student.AsNoTracking().FirstOrDefaultAsync(s => s.Id == schedule.StudentId);
        if (sales == null || student?.UserId == null) return null;
        var studentUser = await _dbContext.User.AsNoTracking().FirstOrDefaultAsync(u => u.Id == student.UserId.Value);
        // Schedule.TutorId holds either the Tutor.Id or the tutor's User.Id.
        var tutor = await _dbContext.Tutor.AsNoTracking().FirstOrDefaultAsync(t => t.Id == schedule.TutorId || t.UserId == schedule.TutorId);
        var tutorUser = tutor == null ? null : await _dbContext.User.AsNoTracking().FirstOrDefaultAsync(u => u.Id == tutor.UserId);
        var codeIds = new[] { salesDetails.SubjectId, sales.GradeId ?? Guid.Empty, sales.BoardId ?? Guid.Empty };
        var codes = await _dbContext.Type_Code.AsNoTracking().Where(c => codeIds.Contains(c.Id))
            .ToDictionaryAsync(c => c.Id, c => c.TypeCodeName);
        string Code(Guid? id) => id.HasValue && codes.TryGetValue(id.Value, out var name) ? name ?? "" : "";

        // Same hour rounding as the month-end invoice: each class rounded up to 15 minutes.
        var monthClasses = classes.Where(c => c.Date.Month == month && c.Date.Year == year).ToList();
        var hours = monthClasses.Sum(c => Math.Ceiling((c.EndTime - c.StartTime).TotalMinutes / 15.0) * 15) / 60.0;
        var amount = Math.Round((decimal)hours * salesDetails.ParentPayment, 2);
        if (amount <= 0) return null;

        var now = DateTime.Now;
        var invoice = new StudentInvoice
        {
            InvoiceNumber = $"INV-{now:yyyyMMdd-HHmmss}-{schedule.StudentId.ToString().Substring(0, 8).ToUpper()}",
            InvoiceType = AdvanceInvoiceType,
            StudentId = schedule.StudentId,
            ScheduleId = scheduleId,
            TotalInvoiceAmount = amount,
            Month = month,
            Year = year,
            StartDate = now,
            DueDate = now.AddDays(5),
            IsActive = true,
            CreatedBy = createdBy,
            CreatedDate = now,
        };
        var studentName = studentUser == null ? "" : $"{studentUser.FirstName} {studentUser.LastName}".Trim();
        using var transaction = await _dbContext.Database.BeginTransactionAsync();
        _dbContext.Set<StudentInvoice>().Add(invoice);
        await _dbContext.SaveChangesAsync();
        _dbContext.Set<StudentInvoiceDetails>().Add(new StudentInvoiceDetails
        {
            StudentInvoiceId = invoice.Id,
            UserId = student.UserId.Value,
            ScheduleId = scheduleId,
            StudentId = schedule.StudentId,
            StudentName = studentName,
            ParentName = student.ParentName ?? "",
            TutorId = schedule.TutorId,
            TutorName = tutorUser == null ? "" : (tutorUser.FullName ?? $"{tutorUser.FirstName} {tutorUser.LastName}"),
            Grade = Code(sales.GradeId),
            Board = Code(sales.BoardId),
            Subject = Code(salesDetails.SubjectId),
            Year = year,
            Month = month,
            ParentPayment = salesDetails.ParentPayment,
            NumberOfClasses = monthClasses.Count,
            // The first month has no previous month (both columns are NOT NULL).
            PreviousMonthTotalClasses = 0,
            PreviousMonthPendingClasses = 0,
            PreviousMonthPendingClassesMonthYear = "",
            ScheduleType = "Class",
            SubjectAmount = amount,
            IsActive = true,
            CreatedBy = createdBy,
            CreatedDate = DateTime.UtcNow,
        });
        await _dbContext.SaveChangesAsync();
        await transaction.CommitAsync();
        return invoice.InvoiceNumber;
    }

    // Advance invoices of one student (Student.Id), newest first.
    public async Task<List<AdvanceInvoiceDto>> GetAdvanceInvoicesAsync(Guid studentId) =>
        await (from invoice in _dbContext.Set<StudentInvoice>()
               join detail in _dbContext.Set<StudentInvoiceDetails>() on invoice.Id equals detail.StudentInvoiceId
               where invoice.StudentId == studentId && invoice.IsActive && detail.IsActive && invoice.InvoiceType == AdvanceInvoiceType
               orderby invoice.CreatedDate descending
               select new AdvanceInvoiceDto
               {
                   InvoiceNumber = invoice.InvoiceNumber,
                   Subject = detail.Subject,
                   Month = invoice.Month,
                   Year = invoice.Year,
                   NumberOfClasses = detail.NumberOfClasses,
                   ParentPayment = detail.ParentPayment,
                   TotalAmount = invoice.TotalInvoiceAmount,
                   CreatedDate = invoice.CreatedDate,
                   EmailSentDate = invoice.EmailSentDate,
               }).ToListAsync();

    // Accounts send the advance invoice: add the Stripe payment link, email it to the parent, mark it sent.
    public async Task<AdvanceInvoiceSendResultDto> SendAdvanceInvoiceAsync(string invoiceNumber)
    {
        var invoice = await _dbContext.Set<StudentInvoice>()
            .FirstOrDefaultAsync(i => i.InvoiceNumber == invoiceNumber && i.IsActive && i.InvoiceType == AdvanceInvoiceType);
        if (invoice == null) return new() { Succeeded = false, Message = "Advance invoice not found." };
        if (invoice.EmailSentDate.HasValue)
            return new() { Succeeded = false, Message = $"This invoice was already sent on {invoice.EmailSentDate:dd-MMM-yyyy hh:mm tt}.", EmailSentDate = invoice.EmailSentDate };

        var detail = await _dbContext.Set<StudentInvoiceDetails>().AsNoTracking()
            .FirstOrDefaultAsync(d => d.StudentInvoiceId == invoice.Id && d.IsActive);
        if (detail == null) return new() { Succeeded = false, Message = "Invoice details not found." };
        var parentEmail = await _dbContext.User.Where(u => u.Id == detail.UserId).Select(u => u.Email).FirstOrDefaultAsync();
        if (string.IsNullOrWhiteSpace(parentEmail)) return new() { Succeeded = false, Message = "The student has no email address." };

        var monthYear = new DateTime(invoice.Year, invoice.Month, 1).ToString("MMMM yyyy");
        if (string.IsNullOrEmpty(invoice.PaymentUrl))
        {
            try
            {
                var secretKey = _configuration["Stripe:SecretKey"];
                if (!string.IsNullOrEmpty(secretKey))
                {
                    StripeConfiguration.ApiKey = secretKey;
                    var price = await new PriceService().CreateAsync(new PriceCreateOptions
                    {
                        Currency = "inr",
                        UnitAmount = (long)(invoice.TotalInvoiceAmount * 100),
                        ProductData = new PriceProductDataOptions { Name = $"{detail.StudentName} — Tuition Fees ({monthYear}, advance)" },
                    });
                    var link = await new PaymentLinkService().CreateAsync(new PaymentLinkCreateOptions
                    {
                        LineItems = new List<PaymentLinkLineItemOptions> { new() { Price = price.Id, Quantity = 1 } },
                        Metadata = new Dictionary<string, string>
                        {
                            { "invoice_number", invoice.InvoiceNumber },
                            { "student_id", invoice.StudentId.ToString() },
                            { "student_name", detail.StudentName ?? "" },
                            { "month_year", $"{invoice.Month}/{invoice.Year}" },
                        },
                    });
                    invoice.PaymentUrl = link.Url;
                }
            }
            catch (Exception)
            {
                // Non-fatal, as for the month-end invoice: the invoice is still sent without the Pay Now link.
            }
        }

        await _emailService.SendInvoiceWithPdfAsync(new InvoiceEmailData
        {
            ThrowOnFailure = true,
            ToEmail = parentEmail,
            StudentName = detail.StudentName ?? "",
            ParentName = string.IsNullOrWhiteSpace(detail.ParentName) ? detail.StudentName ?? "" : detail.ParentName,
            InvoiceNumber = invoice.InvoiceNumber,
            MonthYear = monthYear,
            TotalAmount = invoice.TotalInvoiceAmount,
            PaymentUrl = invoice.PaymentUrl,
            Grade = detail.Grade ?? "",
            Board = detail.Board ?? "",
            DueDate = invoice.DueDate ?? DateTime.Now.AddDays(5),
            LineItems = new List<TCT.LMS.Infrastructure.Common.InvoiceLineItem>
            {
                new()
                {
                    Subject = detail.Subject ?? "",
                    TutorName = string.IsNullOrWhiteSpace(detail.TutorName) ? "N/A" : detail.TutorName,
                    NumberOfClasses = detail.NumberOfClasses,
                    ParentPayment = detail.ParentPayment,
                    TotalAmount = invoice.TotalInvoiceAmount,
                    StartDate = (invoice.StartDate ?? invoice.CreatedDate).ToString("dd-MMM-yyyy"),
                    PreviousMonthPeriod = new DateTime(invoice.Year, invoice.Month, 1).AddMonths(-1).ToString("MMMM yyyy"),
                },
            },
        });

        invoice.EmailSentDate = DateTime.Now;
        await _dbContext.SaveChangesAsync();
        return new() { Succeeded = true, Message = $"Invoice {invoice.InvoiceNumber} sent to {parentEmail}.", EmailSentDate = invoice.EmailSentDate };
    }

    // Schedules already billed for this month by an advance invoice; the month-end invoice leaves them out.
    private async Task<List<Guid>> GetAdvanceBilledScheduleIdsAsync(Guid studentId, int month, int year) =>
        await (from invoice in _dbContext.Set<StudentInvoice>()
               join detail in _dbContext.Set<StudentInvoiceDetails>() on invoice.Id equals detail.StudentInvoiceId
               where invoice.StudentId == studentId && invoice.IsActive && detail.IsActive
                   && invoice.InvoiceType == AdvanceInvoiceType && invoice.Month == month && invoice.Year == year
               select detail.ScheduleId).Distinct().ToListAsync();
}
