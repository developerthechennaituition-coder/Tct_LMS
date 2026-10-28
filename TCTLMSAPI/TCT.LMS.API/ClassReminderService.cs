using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Common;
using TCT.LMS.API.NotificationHub;
using TCT.LMS.Data.Common;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Domain.Entities;

namespace TCT.LMS.API;

public sealed class ClassReminderService : BackgroundService
{
    private const string GroupChatType = "GroupChat";

    // Legacy AddOrUpdateSchedule stored the numeric type code instead of the enum name.
    private static readonly string[] ClassScheduleTypes =
    {
        Domain.ScheduleType.Class.ToString(),
        ((int)Domain.ScheduleType.Class).ToString()
    };

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHubContext<PushNotificationHub> _hubContext;
    private readonly ILogger<ClassReminderService> _logger;

    public ClassReminderService(
        IServiceScopeFactory scopeFactory,
        IHubContext<PushNotificationHub> hubContext,
        ILogger<ClassReminderService> logger)
    {
        _scopeFactory = scopeFactory;
        _hubContext = hubContext;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await SendDueReminders(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process class chat reminders");
            }

            await timer.WaitForNextTickAsync(stoppingToken);
        }
    }

    private async Task SendDueReminders(CancellationToken cancellationToken)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        // ScheduleDetails.StartTime/EndTime are stored as TCT local (India) time.
        // Compare them with the same clock; using UTC here moved the reminder
        // window by 5.5 hours and skipped the intended two-hour reminder.
        var now = DateHelper.TCTConvertTimeFromUtc(DateTime.UtcNow);
        var windowEnd = now.AddHours(2);
        var inactiveOutcomes = await db.Type_Code.Where(code =>
                new[] { 1009001, 1009002, 1009003, 1009005, 1009006, 1009007, 20020, 20021, 20022, 20023 }.Contains(code.TypeCodeValue))
            .Select(code => code.Id).ToListAsync(cancellationToken);

        var dueClassIds = await (
            from detail in db.ScheduleDetails
            join schedule in db.Schedule on detail.ScheduleId equals schedule.ScheduleId
            where detail.IsActive && schedule.IsActive
                && ClassScheduleTypes.Contains(detail.ScheduleType)
                && detail.StartTime > now && detail.StartTime <= windowEnd
                && detail.ClassReminderSentDate == null
                && (!detail.TutorScheduleStatus.HasValue || !inactiveOutcomes.Contains(detail.TutorScheduleStatus.Value))
                && (!detail.OperationScheduleStatus.HasValue || !inactiveOutcomes.Contains(detail.OperationScheduleStatus.Value))
            select detail.ScheduleDetailsId)
            .ToListAsync(cancellationToken);

        // Each class gets its own scope so one bad record (missing sales data,
        // failed email, etc.) can no longer abort every other class's reminder.
        foreach (var scheduleDetailsId in dueClassIds)
        {
            try
            {
                await SendReminder(scheduleDetailsId, now, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send class reminder for ScheduleDetailsId {ScheduleDetailsId}",
                    scheduleDetailsId);
            }
        }
    }

    private async Task SendReminder(Guid scheduleDetailsId, DateTime now, CancellationToken cancellationToken)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var item = await (
            from detail in db.ScheduleDetails
            join schedule in db.Schedule on detail.ScheduleId equals schedule.ScheduleId
            join salesDetails in db.SalesDetails on schedule.SalesDetailsId equals salesDetails.Id
            join sales in db.Sales on salesDetails.SalesId equals sales.Id
            where detail.ScheduleDetailsId == scheduleDetailsId && detail.ClassReminderSentDate == null
            select new { Detail = detail, Schedule = schedule, SalesDetails = salesDetails, Sales = sales })
            .FirstOrDefaultAsync(cancellationToken);
        if (item == null) return;

        // The chat reminder is the primary channel, so it is sent first and
        // committed on its own; notification/email problems must not block it.
        var chatSent = await SendChatReminder(db, item.Detail, item.Schedule, item.SalesDetails, item.Sales,
            cancellationToken);

        if (!chatSent)
        {
            _logger.LogWarning(
                "Class reminder for ScheduleDetailsId {ScheduleDetailsId} was not posted to chat: no active chat group found for SalesDetailsId {SalesDetailsId}",
                scheduleDetailsId, item.SalesDetails.Id);
            // Keep the reminder eligible for retry if its group/sender is not ready.
            return;
        }

        try
        {
            var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();
            await notificationService.AddClassReminderNotifications(
                item.Sales.Id,
                item.SalesDetails.Id,
                item.Schedule.CreatedBy != Guid.Empty ? item.Schedule.CreatedBy : item.SalesDetails.Coordinator,
                item.Detail.StartTime,
                item.Detail.EndTime);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Class reminder notification failed for ScheduleDetailsId {ScheduleDetailsId}",
                scheduleDetailsId);
        }
    }

    private async Task<bool> SendChatReminder(ApplicationDbContext db, ScheduleDetails detail, Schedule schedule,
        SalesDetails salesDetails, Sales sales, CancellationToken cancellationToken)
    {
        var group = await FindClassGroup(db, salesDetails, sales, cancellationToken);
        if (group == null) return false;

        var members = await db.GroupMembers.Where(value => value.GroupId == group.Id && value.IsActive)
            .Select(value => value.UserId).Distinct().ToListAsync(cancellationToken);

        // The chat screen loads the sender as a User row, so the sender must be a
        // real user. Schedule.TutorId is not guaranteed to be a User id.
        var senderCandidates = new[] { group.CreatedBy, salesDetails.Coordinator, schedule.CreatedBy }
            .Where(value => value.HasValue && value.Value != Guid.Empty)
            .Select(value => value!.Value)
            .ToList();
        var existingSenders = await db.User.Where(value => senderCandidates.Contains(value.Id))
            .Select(value => value.Id).ToListAsync(cancellationToken);
        var senderId = senderCandidates.FirstOrDefault(existingSenders.Contains);
        if (senderId == Guid.Empty) senderId = members.FirstOrDefault();
        if (senderId == Guid.Empty) return false;

        using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var claimedAt = DateHelper.TCTConvertTimeFromUtc(DateTime.UtcNow);
        var claimed = await db.ScheduleDetails.Where(row => row.ScheduleDetailsId == detail.ScheduleDetailsId
                && row.ClassReminderSentDate == null && row.IsActive && row.StartTime > claimedAt)
            .ExecuteUpdateAsync(setters => setters.SetProperty(row => row.ClassReminderSentDate, claimedAt), cancellationToken);
        if (claimed == 0) return false;

        // Chat timestamps are stored in UTC everywhere else (ChatController); using
        // local time here pushed the reminder 5.5 hours into the future in the chat.
        var utcNow = DateTime.UtcNow;
        var conversation = new Conversation
        {
            ConversationId = $"reminder_{Guid.NewGuid():N}", GroupId = group.Id, UserId = group.Id,
            SenderId = senderId, ReceiverId = group.Id, ConversationDate = utcNow, CreatedAt = utcNow,
            ConvType = GroupChatType, Delivered = false, Unread = true
        };
        db.Conversations.Add(conversation);

        var messageId = Guid.NewGuid();
        db.Messages.Add(new Message
        {
            Id = messageId, ConversationId = conversation.ConversationId,
            MessageText = $"Class reminder: {detail.Title ?? schedule.Title ?? "Your class"} is scheduled for " +
                          $"({detail.StartTime:dd MMM yyyy, h:mm tt} - {detail.EndTime:h:mm tt} IST).",
            IsFromMe = false, IsDeleted = false, MessageDate = utcNow, CreatedAt = utcNow,
            ScheduleDetailsId = detail.ScheduleDetailsId
        });

        db.MessageStatus.AddRange(members.Where(value => value != senderId).Select(value => new MessageStatus
        {
            Id = Guid.NewGuid(), MessageId = messageId, UserId = value, CreatedAt = utcNow,
            IsDelivered = false, IsRead = false
        }));

        // Commit the message and marker together. A failed live push must not
        // create a duplicate persisted chat message on the next timer tick.
        detail.ClassReminderSentDate = DateHelper.TCTConvertTimeFromUtc(utcNow);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        try
        {
            var connections = PushNotificationHub.GetConnectionIdsForUsers(members);
            if (connections.Count > 0)
            {
                await _hubContext.Clients.Clients(connections).SendAsync("ReceivePushMessage", GroupChatType, new
                {
                    SenderId = senderId, ReceiverId = group.Id, GroupMember = members
                }, cancellationToken);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Reminder persisted, but live push failed for {ScheduleDetailsId}", detail.ScheduleDetailsId);
        }

        return true;
    }

    private static async Task<Group?> FindClassGroup(ApplicationDbContext db, SalesDetails salesDetails, Sales sales,
        CancellationToken cancellationToken)
    {
        var group = await db.Groups.FirstOrDefaultAsync(
            value => value.Active && value.SalesDetailsId == salesDetails.Id, cancellationToken);
        if (group != null) return group;

        // Groups created before Groups.SalesDetailsId existed, or reused by a later
        // tutor assignment, were never linked to the enrolment. Match them the same
        // way SalesService does when it looks up an existing group.
        group = await db.Groups
            .Where(value => value.Active
                && value.StudentId == sales.StudentId
                && value.SubjectId == salesDetails.SubjectId
                && value.BoardId == sales.BoardId
                && value.GradeId == sales.GradeId)
            .OrderByDescending(value => value.Created)
            .FirstOrDefaultAsync(cancellationToken);

        if (group != null && group.SalesDetailsId == null)
        {
            group.SalesDetailsId = salesDetails.Id;
        }

        return group;
    }
}
