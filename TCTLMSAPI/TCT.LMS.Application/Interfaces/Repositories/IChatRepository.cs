using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Message;

namespace TCT.LMS.Application.Interfaces.Repositories;

public interface IChatRepository
{
    Task<Chats> GetChatByIdAsync(long chatId);
    Task<List<Chats>> GetUserChatsAsync(Guid userId);
    Task<Chats> CreateChatAsync(Chats chat);
    Task<ChatMessages> AddMessageAsync(ChatMessages message);
    Task<List<ChatMessages>> GetChatMessagesAsync(long chatId);
    Task<bool> IsChatParticipantAsync(Guid userId, long chatId);
}
