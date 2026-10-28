
public interface INotificationStrategy
{
    Task ExecuteAsync(NotificationContext context);
}
