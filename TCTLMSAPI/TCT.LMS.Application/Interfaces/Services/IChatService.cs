using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Message;

namespace TCT.LMS.Application.Interfaces.Services;

public interface IChatService
{
    Task<Chats> CreateChatAsync(Guid tutorId, Guid studentId);
    Task<ChatMessages> SaveMessageAsync(long chatId, Guid userId, string message);
    Task<List<Chats>> GetUserChatsAsync(Guid userId);
    Task<List<ChatMessages>> GetChatMessagesAsync(long chatId, Guid userId);
}
