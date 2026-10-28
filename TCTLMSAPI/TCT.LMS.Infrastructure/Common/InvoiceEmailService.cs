using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TCT.LMS.Infrastructure.Common;

namespace TCT.LMS.Infrastructure.Common
{
    public interface IEmailService
    {
        Task SendInvoiceWithPdfAsync(InvoiceEmailData data);
    }

    public class EmailService : IEmailService
    {
        private readonly EmailSettings _settings;
        private readonly IInvoicePdfService _pdfService;
        private readonly ILogger<EmailService> _logger;

        public EmailService(
            IOptions<EmailSettings> settings,
            IInvoicePdfService pdfService,
            ILogger<EmailService> logger)
        {
            _settings = settings.Value;
            _pdfService = pdfService;
            _logger = logger;
        }

        public async Task SendInvoiceWithPdfAsync(InvoiceEmailData data)
        {
            try
            {
                var pdfBytes = _pdfService.GenerateInvoicePdf(data);
                var fileName = $"TCT-Invoice-{data.InvoiceNumber}.pdf";

                using var client = new SmtpClient(_settings.SmtpServer, _settings.SmtpPort)
                {
                    Credentials = new NetworkCredential(_settings.FromEmail, _settings.FromPassword),
                    EnableSsl = true,
                    DeliveryMethod = SmtpDeliveryMethod.Network,
                };

                using var mail = new MailMessage
                {
                    From = new MailAddress(_settings.FromEmail, _settings.FromName),
                    Subject = $"Invoice for {data.MonthYear} — {data.InvoiceNumber} | The Chennai Tuition",
                    IsBodyHtml = true,
                    Body = BuildEmailHtml(data),
                };

                mail.To.Add(data.ToEmail);

                var pdfStream = new MemoryStream(pdfBytes);
                var attachment = new Attachment(pdfStream, fileName, "application/pdf");
                mail.Attachments.Add(attachment);

                await client.SendMailAsync(mail);

                _logger.LogInformation("Invoice email with PDF sent to {Email} for {InvoiceNumber}",
                    data.ToEmail, data.InvoiceNumber);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send invoice email to {Email} for {InvoiceNumber}",
                    data.ToEmail, data.InvoiceNumber);
                if (data.ThrowOnFailure) throw;
            }
        }

        private string BuildEmailHtml(InvoiceEmailData data)
        {
            var amount = data.TotalAmount.ToString("N2");
            var payButtonHtml = !string.IsNullOrEmpty(data.PaymentUrl)
                ? $@"<div style='text-align:center;margin:28px 0;'>
                       <a href='{data.PaymentUrl}'
                          style='display:inline-block;background:#7CB342;color:#fff;
                                 padding:14px 40px;border-radius:6px;text-decoration:none;
                                 font-size:16px;font-weight:600;'>
                         Pay Now — ₹{amount}
                       </a>
                       <p style='color:#aaa;font-size:11px;margin-top:8px;'>
                         Or scan the QR code in the attached PDF
                       </p>
                     </div>"
                : "";

            return $@"<!DOCTYPE html>
<html>
<head><meta charset='utf-8'/></head>
<body style='margin:0;padding:0;background:#f4f7f6;font-family:Segoe UI,Arial,sans-serif;'>
  <div style='max-width:600px;margin:30px auto;background:#fff;
              border-radius:10px;overflow:hidden;
              box-shadow:0 2px 10px rgba(0,0,0,0.08);'>

    <!-- Header -->
    <div style='background:#1a1a2e;padding:24px 32px;'>
      <h1 style='color:#7CB342;font-size:22px;font-weight:300;margin:0;letter-spacing:1px;'>
        THE CHENNAI TUITION
      </h1>
      <p style='color:rgba(255,255,255,0.45);font-size:11px;margin:4px 0 0;'>
        Monthly Invoice
      </p>
    </div>

    <!-- Body -->
    <div style='padding:28px 32px;'>

      <!-- Greeting -->
      <p style='font-size:15px;color:#333;margin:0 0 6px;'>
        Dear <strong>{data.ParentName}</strong>,
      </p>
      <p style='font-size:13px;color:#555;line-height:1.7;margin:0 0 16px;'>
        Your invoice for <strong>{data.StudentName}</strong> for
        <strong>{data.MonthYear}</strong> has been generated.
        Please find the invoice PDF attached to this email.
      </p>

      <!-- ✅ Portal note — new addition -->
      <div style='background:#f0fdf4;border-left:4px solid #7CB342;
                  border-radius:0 6px 6px 0;padding:14px 16px;margin-bottom:20px;'>
        <p style='font-size:13px;color:#2d6a2d;margin:0;line-height:1.7;'>
          <strong>&#128241; View online:</strong> You can also view and download this invoice
          anytime by logging into the
          <strong>TCT Student Portal</strong>.
          Navigate to <strong>Invoice</strong> section in your student account to access
          all your invoices, payment history and receipts.
        </p>
      </div>

      <!-- Invoice summary card -->
      <div style='background:#f9f9f9;border:1px solid #eee;
                  border-radius:8px;padding:18px;margin-bottom:20px;'>
        <table style='width:100%;border-collapse:collapse;font-size:13px;'>
          <tr>
            <td style='padding:7px 0;color:#777;'>Invoice Number</td>
            <td style='padding:7px 0;font-weight:600;text-align:right;color:#222;'>
              {data.InvoiceNumber}
            </td>
          </tr>
          <tr style='border-top:1px solid #eee;'>
            <td style='padding:7px 0;color:#777;'>Student</td>
            <td style='padding:7px 0;font-weight:600;text-align:right;color:#222;'>
              {data.StudentName}
            </td>
          </tr>
          <tr style='border-top:1px solid #eee;'>
            <td style='padding:7px 0;color:#777;'>Period</td>
            <td style='padding:7px 0;font-weight:600;text-align:right;color:#222;'>
              {data.MonthYear}
            </td>
          </tr>
          <tr style='border-top:1px solid #eee;'>
            <td style='padding:7px 0;color:#777;'>Due Date</td>
            <td style='padding:7px 0;font-weight:600;color:#dc2626;text-align:right;'>
              {data.DueDate:dd-MMM-yyyy}
            </td>
          </tr>
          <tr style='border-top:2px solid #7CB342;'>
            <td style='padding:12px 0;font-weight:700;font-size:15px;color:#333;'>
              Total Amount
            </td>
            <td style='padding:12px 0;font-weight:700;font-size:18px;
                       color:#7CB342;text-align:right;'>
              ₹{amount}
            </td>
          </tr>
        </table>
      </div>

      <!-- Pay Now button -->
      {payButtonHtml}

      <!-- Bank details -->
      <div style='background:#f0fdf4;border:1px solid #c6e9a7;border-radius:8px;
                  padding:14px;margin-bottom:20px;font-size:12px;'>
        <div style='font-weight:700;color:#7CB342;margin-bottom:6px;font-size:13px;'>
          Bank Transfer Details
        </div>
        <div style='color:#444;line-height:1.8;'>
          <strong>Account Name:</strong> Cambridge Enterprises<br/>
          <strong>Account Number:</strong> 50200103194651<br/>
          <strong>IFSC Code:</strong> HDFC0000206<br/>
          <strong>Bank:</strong> HDFC - MS | Current Account
        </div>
      </div>

      <p style='font-size:11px;color:#999;line-height:1.6;margin:0;'>
        Please mention <strong>{data.InvoiceNumber}</strong> and student name
        in payment remarks. Payment due within 5 days to avoid late charges.
      </p>
    </div>

    <!-- Footer -->
    <div style='background:#f9f9f9;border-top:1px solid #eee;
                padding:14px 32px;text-align:center;'>
      <p style='font-size:11px;color:#aaa;margin:0;'>
        The Chennai Tuition &nbsp;·&nbsp;
        accounts@thechennaituition.com &nbsp;·&nbsp;
        +91 90421 71782
      </p>
      <p style='font-size:10px;color:#ccc;margin:5px 0 0;font-style:italic;'>
        This is an automated email. Please do not reply directly to this message.
      </p>
    </div>

  </div>
</body>
</html>";
        }
    }
}
