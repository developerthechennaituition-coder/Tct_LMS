using DocumentFormat.OpenXml.InkML;
using DocumentFormat.OpenXml.Spreadsheet;
using Microsoft.AspNetCore.SignalR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.API.NotificationHub;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.ChatApp;

namespace TCT.LMS.Application.Services
{
    public class MessageStatusService : IMessageStatusService
    {
        public readonly IMessageStatusRepository _messageStatusRepository;
        private readonly IHubContext<PushNotificationHub> _hubContext;
        public MessageStatusService(IMessageStatusRepository messageStatusRepository, IHubContext<PushNotificationHub> hubContext)
        {
            _messageStatusRepository = messageStatusRepository;
            _hubContext = hubContext;
        }

        public async Task<List<MessageStatus>> MarkDeliveredForOnlineUsers(Guid messageId, List<Guid> onlineUsers)
        {
            var deliveredMessages = await _messageStatusRepository.MarkDeliveredForOnlineUsers(messageId, onlineUsers);
            return deliveredMessages;
        }

        public async Task<List<MessageStatusNotificationDto>> MarkGroupMessagesDelivered(Guid userId)
        {
            var deliveredMessages = await _messageStatusRepository.MarkGroupMessagesDelivered(userId);
            return deliveredMessages;
        }

        public async Task MarkDeliveredIfEveryoneOnline(Guid messageId, List<Guid> groupMembers, Guid senderId)
        {
            List<Guid> onlineUsers = PushNotificationHub.GetOnlineUsers().ToList();

            var receivers = groupMembers.Where(x => x != senderId).Distinct().ToList();

            bool everyoneOnline = receivers.All(x => onlineUsers.Contains(x));

            if (!everyoneOnline)
                return;

            await _messageStatusRepository.MarkDeliveredForAllReceivers(messageId);
        }

        public async Task MarkGroupMessagesRead(string conversationId, Guid userId)
        {
            var statuses = await _messageStatusRepository.MarkReadForUser(conversationId, userId);

            foreach (var item in statuses)
            {
                var connections = PushNotificationHub.GetConnectionIds(item.SenderId);

                if (connections.Any())
                {
                    await _hubContext.Clients.Clients(connections).SendAsync("GroupMessageRead", new
                    {
                        item.MessageId,
                        item.UserId,
                        item.ReadAt
                    });
                }
            }
        }

        public async Task<MessageInfoDto> GetMessageInfo(Guid messageId)
        {
            return await _messageStatusRepository.GetMessageInfo(messageId);
        }

        public async Task MarkGroupMessagesRead(Guid groupId, Guid userId)
        {
            var statuses = await _messageStatusRepository.MarkReadForGroup(groupId, userId);

            foreach (var item in statuses)
            {
                var connections = PushNotificationHub.GetConnectionIds(item.SenderId);

                if (connections.Any())
                {
                    await _hubContext.Clients.Clients(connections).SendAsync("GroupMessageRead", new
                    {
                        item.MessageId,
                        item.UserId,
                        item.ReadAt,
                        item.GroupId,
                        item.GroupName
                    });
                }
            }
        }
    }
}
