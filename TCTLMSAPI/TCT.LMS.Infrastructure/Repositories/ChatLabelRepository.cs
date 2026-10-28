using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Data.Common;
using TCT.LMS.Domain.Entities;

namespace TCT.LMS.Infrastructure.Repositories;

public class ChatLabelRepository : IChatLabelRepository
{
    private readonly ApplicationDbContext _dbContext;

    public ChatLabelRepository(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<ChatLabel> CreateLabelAsync(ChatLabel label)
    {
        _dbContext.ChatLabels.Add(label);
        await _dbContext.SaveChangesAsync();

        return label;
    }

    public async Task<List<ChatLabel>> GetLabelsAsync(Guid userId)
    {
        return await _dbContext.ChatLabels
            .Where(x => x.CreatedBy == userId && x.IsActive)
            .OrderBy(x => x.Name)
            .ToListAsync();
    }

    public async Task<ChatLabel?> GetLabelByIdAsync(Guid labelId)
    {
        return await _dbContext.ChatLabels
            .Include(x => x.Members)
            .FirstOrDefaultAsync(x => x.Id == labelId && x.IsActive);
    }

    public async Task<ChatLabelMember> AddMemberAsync(ChatLabelMember member)
    {
        _dbContext.ChatLabelMembers.Add(member);
        await _dbContext.SaveChangesAsync();

        return member;
    }

    public async Task<List<ChatLabelMember>> GetLabelMembersAsync(Guid labelId)
    {
        return await _dbContext.ChatLabelMembers
            .Where(x => x.LabelId == labelId && x.IsActive)
            .ToListAsync();
    }

    public async Task<bool> RemoveMemberAsync(Guid labelId, Guid memberId)
    {
        var member = await _dbContext.ChatLabelMembers
            .FirstOrDefaultAsync(x =>
                x.LabelId == labelId &&
                x.Id == memberId &&
                x.IsActive);

        if (member == null)
        {
            return false;
        }

        member.IsActive = false;

        await _dbContext.SaveChangesAsync();

        return true;
    }

    public async Task<bool> DeleteLabelAsync(Guid labelId)
    {
        var label = await _dbContext.ChatLabels
            .FirstOrDefaultAsync(x =>
                x.Id == labelId &&
                x.IsActive);

        if (label == null)
        {
            return false;
        }

        label.IsActive = false;
        label.ModifiedDate = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        return true;
    }
}