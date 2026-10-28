namespace TCT.LMS.Application.Interfaces.Services;

public interface ICommunicationServiceStrategy
{
    //Task<string> SendConfirmationEmail(string emailId, string message);
    //Task<string> SendNotification(string emailId, string message);
    //Task<string> SendNotificationToTutor(string emailId, string message);
    //Task<string> SendNotificationToParent(string emailId, string message);
    Task<string> SendMessageAsync(MailMessage message);
}
