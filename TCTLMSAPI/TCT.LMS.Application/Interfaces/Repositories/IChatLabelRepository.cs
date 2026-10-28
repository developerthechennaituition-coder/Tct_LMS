using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TCT.LMS.Domain.Entities;

namespace TCT.LMS.Application.Interfaces.Repositories;

public interface IChatLabelRepository
{
    Task<ChatLabel> CreateLabelAsync(ChatLabel label);

    Task<List<ChatLabel>> GetLabelsAsync(Guid userId);

    Task<ChatLabel?> GetLabelByIdAsync(Guid labelId);

    Task<ChatLabelMember> AddMemberAsync(ChatLabelMember member);

    Task<List<ChatLabelMember>> GetLabelMembersAsync(Guid labelId);

    Task<bool> RemoveMemberAsync(Guid labelId, Guid memberId);

    Task<bool> DeleteLabelAsync(Guid labelId);
}