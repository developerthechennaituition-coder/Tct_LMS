using Microsoft.EntityFrameworkCore;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Data.Common;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.ChatApp;

namespace TCT.LMS.Infrastructure.Repositories
{
    public class MessageStatusRepository : GenericRepository<MessageStatus>, IMessageStatusRepository
    {
        public readonly ApplicationDbContext _dbContext;
        public MessageStatusRepository(ApplicationDbContext dbContext) : base(dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<List<MessageStatus>> MarkDeliveredForOnlineUsers(Guid messageId, List<Guid> onlineUsers)
        {
            var statuses = await _dbContext.MessageStatus
                .Where(x => x.MessageId == messageId && onlineUsers.Contains(x.UserId) && !x.IsDelivered)
                .ToListAsync();

            foreach (var status in statuses)
            {
                status.IsDelivered = true;
                status.DeliveredAt = DateTime.UtcNow;
            }

            await _dbContext.SaveChangesAsync();

            return statuses;
        }
        public async Task<List<MessageStatusNotificationDto>> MarkGroupMessagesDelivered(Guid userId)
        {
            var pendingStatuses = await (from status in _dbContext.MessageStatus
                                         join message in _dbContext.Messages on status.MessageId equals message.Id
                                         join conversation in _dbContext.Conversations on message.ConversationId equals conversation.ConversationId
                                         where status.UserId == userId && !status.IsDelivered
                                         select new
                                         {
                                             Status = status,
                                             MessageId = message.Id,
                                             SenderId = conversation.SenderId
                                         }).ToListAsync();

            var result = new List<MessageStatusNotificationDto>();

            foreach (var item in pendingStatuses)
            {
                item.Status.IsDelivered = true;
                item.Status.DeliveredAt = DateTime.UtcNow;

                result.Add(new MessageStatusNotificationDto
                {
                    MessageId = item.MessageId,
                    SenderId = item.SenderId,
                    UserId = userId,
                    DeliveredAt = item.Status.DeliveredAt.Value
                });
            }

            await _dbContext.SaveChangesAsync();

            return result;
        }

        public async Task<bool> MarkDeliveredForAllReceivers(Guid messageId)
        {
            var statuses = await _dbContext.MessageStatus.Where(x => x.MessageId == messageId).ToListAsync();

            if (!statuses.Any())
                return false;

            foreach (var status in statuses)
            {
                status.IsDelivered = true;
                status.DeliveredAt = DateTime.UtcNow;
            }
            await _dbContext.SaveChangesAsync();
            return true;
        }

        public async Task<List<MessageStatusNotificationDto>> MarkReadForUser(string conversationId, Guid userId)
        {
            var data = await (from ms in _dbContext.MessageStatus
                              join m in _dbContext.Messages on ms.MessageId equals m.Id
                              join c in _dbContext.Conversations on m.ConversationId equals c.ConversationId
                              where m.ConversationId == conversationId && ms.UserId == userId && !ms.IsRead
                              select new
                              {
                                  Status = ms,
                                  SenderId = c.SenderId
                              }).ToListAsync();

            var result = new List<MessageStatusNotificationDto>();
            foreach (var item in data)
            {
                item.Status.IsRead = true;
                item.Status.ReadAt = DateTime.UtcNow;
                result.Add(new MessageStatusNotificationDto
                {
                    MessageId = item.Status.MessageId,
                    SenderId = item.SenderId,
                    UserId = item.Status.UserId,
                    ReadAt = item.Status.ReadAt
                });
            }
            Console.WriteLine($"ConversationId: {conversationId}, UserId: {userId}, Records found: {data.Count}");
            await _dbContext.SaveChangesAsync();
            return result;
        }

        public async Task<List<MessageStatusNotificationDto>> MarkReadForGroup(Guid groupId, Guid userId)
        {
            var data = await (
                from ms in _dbContext.MessageStatus
                join m in _dbContext.Messages on ms.MessageId equals m.Id
                join c in _dbContext.Conversations on m.ConversationId equals c.ConversationId
                join g in _dbContext.Groups on c.GroupId equals g.Id
                where c.GroupId == groupId && c.ConvType == "GroupChat" && ms.UserId == userId && !ms.IsRead
                select new
                {
                    Status = ms,
                    GroupId = groupId,
                    GroupName = g.GroupName,
                    SenderId = c.SenderId
                })
                .ToListAsync();

            var now = DateTime.UtcNow;

            var result = new List<MessageStatusNotificationDto>();

            foreach (var item in data)
            {
                item.Status.IsRead = true;
                item.Status.ReadAt = now;

                result.Add(new MessageStatusNotificationDto
                {
                    MessageId = item.Status.MessageId,
                    SenderId = item.SenderId,
                    UserId = item.Status.UserId,
                    GroupId = item.GroupId,
                    GroupName = item.GroupName,
                    ReadAt = now
                });
            }

            await _dbContext.SaveChangesAsync();

            return result;
        }
        public async Task<MessageInfoDto> GetMessageInfo(Guid messageId)
        {
            var users = await (from ms in _dbContext.MessageStatus
                               join u in _dbContext.User on ms.UserId equals u.Id
                               where ms.MessageId == messageId
                               select new
                               {
                                   ms.UserId,
                                   u.FirstName,
                                   u.Nickname,
                                   u.Theme,
                                   ms.IsDelivered,
                                   ms.IsRead,
                                   ms.DeliveredAt,
                                   ms.ReadAt
                               }).ToListAsync();

            var result = new MessageInfoDto
            {
                MessageId = messageId,
                ReadBy = users.Where(x => x.IsRead).OrderByDescending(x => x.ReadAt).Select(x => new MessageUserStatusDto
                {
                    UserId = x.UserId,
                    Name = x.FirstName,
                    Nickname = x.Nickname,
                    Theme = x.Theme,
                    ReadAt = x.ReadAt
                }).ToList(),
                DeliveredTo = users.Where(x => x.IsDelivered && !x.IsRead).OrderByDescending(x => x.DeliveredAt).Select(x => new MessageUserStatusDto
                {
                    UserId = x.UserId,
                    Name = x.FirstName,
                    Nickname = x.Nickname,
                    Theme = x.Theme,
                    DeliveredAt = x.DeliveredAt
                }).ToList(),
                Remaining = users.Where(x => !x.IsDelivered).Select(x => new MessageUserStatusDto
                {
                    UserId = x.UserId,
                    Name = x.FirstName,
                    Nickname = x.Nickname,
                    Theme = x.Theme
                }).ToList()
            };
            return result;
        }
    }
}
