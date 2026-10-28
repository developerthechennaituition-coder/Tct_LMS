
public abstract class NotificationStrategyBase : INotificationStrategy
{
    public abstract Task ExecuteAsync(NotificationContext context);
}
