using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Mail;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Domain;
using TCT.LMS.Domain.Enums;
using Microsoft.Extensions.Configuration;
using System.Net.Mime;

namespace TCT.LMS.Application.Services;

public class EmailServiceStrategy : ICommunicationServiceStrategy
{
    private readonly string _smtpServer;
    private readonly int _smtpPort;
    private readonly string _fromEmail;
    private readonly string _fromPassword;
    private readonly string _portalBaseUrl;

    public EmailServiceStrategy(IConfiguration configuration)
    {
        var emailSettings = configuration.GetSection("EmailSettings");
        _smtpServer = emailSettings["SmtpServer"];
        _smtpPort = int.Parse(emailSettings["SmtpPort"]);
        _fromEmail = emailSettings["FromEmail"];
        _fromPassword = emailSettings["FromPassword"];

        var portalSettings = configuration.GetSection("PortalSettings");
        _portalBaseUrl = portalSettings["BaseUrl"]
            ?? throw new InvalidOperationException("PortalSettings:BaseUrl is not configured.");
    }
    public async Task<string> SendMessageAsync(MailMessage message)
    {
        var result = string.Empty;

        if (message.MessageType == MessageType.StudentRegistrationForm)
        {
            message.Link = BuildPortalUrl("student-registration");
        }
        else if (message.MessageType == MessageType.SalesCreated || message.MessageType == MessageType.TutorAssigned || message.MessageType == MessageType.ScheduleDemo || message.MessageType == MessageType.EmployeeAssigned)
        {
            message.Link = string.Empty;
        }
        else
        {
            var link = message.MessageType switch
            {
                MessageType.Registration => "auth-email-verification",
                MessageType.Forgotpassword => "password-reset",
                _ => throw new ArgumentException("Invalid communication type")
            };
            var emailAddress = CryptographyHelper.Encrypt(message.ToEmail);
            message.Link = BuildPortalUrl(link, "email", emailAddress);
        }

        var messageBody = EmailMessageService.GetMessageContent(message);

        using (var mailMessage = new System.Net.Mail.MailMessage())
        {
            // Gmail rejects or rewrites unauthorised From addresses. Always send
            // from the mailbox used to authenticate with SMTP.
            mailMessage.From = new MailAddress(_fromEmail, "The Chennai Tuition LMS");
            mailMessage.To.Add(new MailAddress(message.ToEmail));
            mailMessage.Subject = message.Subject;
            mailMessage.Body = messageBody;
            mailMessage.IsBodyHtml = true;

            using (var client = new SmtpClient(_smtpServer, _smtpPort))
            {
                client.UseDefaultCredentials = false;
                client.Credentials = new NetworkCredential(_fromEmail, _fromPassword);
                client.EnableSsl = true;

                try
                {
                    await client.SendMailAsync(mailMessage);
                    result = "Email sent successfully.";
                }
                catch (Exception ex)
                {
                    result = $"Failed to send email. Error: {ex.Message}";
                    throw;
                }
            }
        }

        return result;
    }

    private string BuildPortalUrl(string relativePath, string? queryName = null, string? queryValue = null)
    {
        if (!Uri.TryCreate(_portalBaseUrl.TrimEnd('/') + "/", UriKind.Absolute, out var baseUri))
        {
            throw new InvalidOperationException("PortalSettings:BaseUrl must be an absolute URL.");
        }

        var builder = new UriBuilder(new Uri(baseUri, relativePath.TrimStart('/')));
        if (!string.IsNullOrWhiteSpace(queryName))
        {
            builder.Query = $"{Uri.EscapeDataString(queryName)}={Uri.EscapeDataString(queryValue ?? string.Empty)}";
        }

        return builder.Uri.AbsoluteUri;
    }
}
