using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.ChatApp;

namespace TCT.LMS.Application.Interfaces.Services
{
    public interface IMessageStatusService
    {
        Task<List<MessageStatusNotificationDto>> MarkGroupMessagesDelivered(Guid userId);
        Task<List<MessageStatus>> MarkDeliveredForOnlineUsers(Guid messageId, List<Guid> onlineUsers);
        Task MarkDeliveredIfEveryoneOnline(Guid messageId, List<Guid> groupMembers, Guid senderId);
        Task MarkGroupMessagesRead(string conversationId, Guid userId);
        Task<MessageInfoDto> GetMessageInfo(Guid messageId);
        Task MarkGroupMessagesRead(Guid groupId, Guid userId);
    }
}
