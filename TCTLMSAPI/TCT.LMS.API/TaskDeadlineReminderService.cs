using Common;
using TCT.LMS.Application.Interfaces.Repositories;

namespace TCT.LMS.API;

/// <summary>
/// My Calendar → Tasks deadline reminders: notifies the assignee at D-7, D-1 and on the due date, and once when the task
/// becomes overdue (rules: UserTaskDeadline). Same pattern as ClassReminderService. Sent reminders are recorded in
/// dbo.UserTaskReminder, so a restart or a second API instance does not send them again.
/// </summary>
public sealed class TaskDeadlineReminderService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(5);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<TaskDeadlineReminderService> _logger;

    public TaskDeadlineReminderService(IServiceScopeFactory scopeFactory, ILogger<TaskDeadlineReminderService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Interval);
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await SendDueReminders(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process task deadline reminders");
            }

            await timer.WaitForNextTickAsync(stoppingToken);
        }
    }

    private async Task SendDueReminders(CancellationToken cancellationToken)
    {
        // Task due dates / times are TCT local (India) wall-clock values, like ScheduleDetails times.
        var now = DateHelper.TCTConvertTimeFromUtc(DateTime.UtcNow);
        IReadOnlyList<TaskReminderCandidate> due;
        await using (var scope = _scopeFactory.CreateAsyncScope())
        {
            due = await scope.ServiceProvider.GetRequiredService<IMyCalendarRepository>().GetDueTaskRemindersAsync(now, cancellationToken);
        }

        // Each reminder gets its own scope, so one failure does not stop the others; it is retried on the next run.
        foreach (var reminder in due)
        {
            try
            {
                await using var scope = _scopeFactory.CreateAsyncScope();
                await scope.ServiceProvider.GetRequiredService<IMyCalendarRepository>().SendTaskReminderAsync(reminder, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send the {Milestone} reminder for UserTaskId {UserTaskId}",
                    reminder.Milestone, reminder.TaskId);
            }
        }
    }
}
