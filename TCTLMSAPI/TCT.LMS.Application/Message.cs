using TCT.LMS.Domain.Enums;

namespace TCT.LMS.Application;

public class MailMessage
{
    public string? Name { get; set; }
    public string? FromEmail { get; set; }
    public string? ToEmail { get; set; }
    public string? Subject { get; set; }
    public string? Body { get; set; }
    public string? Link { get; set; }
    public string? ToPhoneNumber { get; set; }
    public MessageType MessageType { get; set; }
    public string? Password { get; set; }
}
