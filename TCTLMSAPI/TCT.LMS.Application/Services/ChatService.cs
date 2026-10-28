using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Message;

namespace TCT.LMS.Application.Services;

public class ChatService : IChatService
{
    private readonly IChatRepository _chatRepository;

    public ChatService(IChatRepository chatRepository)
    {
        _chatRepository = chatRepository;
    }

    public async Task<Chats> CreateChatAsync(Guid tutorId, Guid studentId)
    {
        var chat = new Chats
        {
            TutorId = tutorId,
            StudentId = studentId,
            AdminId = new Guid(),
            Messages = new List<ChatMessages>()
        };

        return await _chatRepository.CreateChatAsync(chat);
    }

    public async Task<ChatMessages> SaveMessageAsync(long chatId, Guid userId, string message)
    {
        if (!await _chatRepository.IsChatParticipantAsync(userId, chatId))
            throw new UnauthorizedAccessException("User is not a participant in this chat");

        var chatMessage = new ChatMessages
        {
            ChatId = chatId,
            UserId = userId,
            Message = message,
            Timestamp = DateTime.UtcNow
        };

        return await _chatRepository.AddMessageAsync(chatMessage);
    }

    public async Task<List<Chats>> GetUserChatsAsync(Guid userId)
    {
        return await _chatRepository.GetUserChatsAsync(userId);
    }

    public async Task<List<ChatMessages>> GetChatMessagesAsync(long chatId, Guid userId)
    {
        if (!await _chatRepository.IsChatParticipantAsync(userId, chatId))
            throw new UnauthorizedAccessException("User is not a participant in this chat");

        return await _chatRepository.GetChatMessagesAsync(chatId);
    }
}
