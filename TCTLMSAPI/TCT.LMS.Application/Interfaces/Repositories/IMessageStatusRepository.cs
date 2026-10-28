using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.ChatApp;

namespace TCT.LMS.Application.Interfaces.Repositories
{
    public interface IMessageStatusRepository : IGenericRepository<MessageStatus>
    {
        Task<List<MessageStatusNotificationDto>> MarkGroupMessagesDelivered(Guid userId);
        Task<List<MessageStatus>> MarkDeliveredForOnlineUsers(Guid messageId, List<Guid> onlineUsers);
        Task<bool> MarkDeliveredForAllReceivers(Guid messageId);
        Task<List<MessageStatusNotificationDto>> MarkReadForUser(string conversationId, Guid userId);
        Task<MessageInfoDto> GetMessageInfo(Guid messageId);
        Task<List<MessageStatusNotificationDto>> MarkReadForGroup(Guid groupId, Guid userId);
    }
}
