using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Application;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Data.Common;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Message;

namespace TCT.LMS.Infrastructure.Repositories;

public class ChatRepository : IChatRepository
{
    private readonly ApplicationDbContext _dbContext;

    public ChatRepository(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Chats> GetChatByIdAsync(long chatId)
    {
        return await _dbContext.Chats
            .Include(c => c.Messages)
            .FirstOrDefaultAsync(c => c.Id == chatId);
    }

    public async Task<List<Chats>> GetUserChatsAsync(Guid userId)
    {
        return await _dbContext.Chats
            .Include(c => c.Messages)
            .Where(c => c.TutorId == userId || c.StudentId == userId || c.AdminId == userId)
            .ToListAsync();
    }

    public async Task<Chats> CreateChatAsync(Chats chat)
    {
        _dbContext.Chats.Add(chat);
        await _dbContext.SaveChangesAsync();
        return chat;
    }

    public async Task<ChatMessages> AddMessageAsync(ChatMessages message)
    {
        _dbContext.ChatMessages.Add(message);
        await _dbContext.SaveChangesAsync();
        return message;
    }

    public async Task<List<ChatMessages>> GetChatMessagesAsync(long chatId)
    {
        return await _dbContext.ChatMessages
            .Where(m => m.ChatId == chatId)
            .OrderBy(m => m.Timestamp)
            .ToListAsync();
    }

    public async Task<bool> IsChatParticipantAsync(Guid userId, long chatId)
    {
        var chat = await _dbContext.Chats.FindAsync(chatId);
        return chat != null && (chat.TutorId == userId || chat.StudentId == userId || chat.AdminId == userId);

    }
}
