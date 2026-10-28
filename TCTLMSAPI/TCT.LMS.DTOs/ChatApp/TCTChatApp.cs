using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using TCT.LMS.DTOs.Address;

namespace TCT.LMS.DTOs.ChatApp;

public class ChatUserDto
{
    public Guid UserId { get; set; }
    public string Name { get; set; }
    public string Nickname { get; set; }
    public string Theme { get; set; }
    public string ChatTheme { get; set; }
    public bool IsFavorite { get; set; }
    public string LastActiveStatus { get; set; }
    public string LastActiveDate { get; set; }
    public bool UnreadMessages { get; set; }
    public bool IsArchived { get; set; }
    public bool IsDelivered { get; set; }
}

public class UsersChats
{
    public Guid Id { get; set; }
    public bool Group { get; set; }
    public string Name { get; set; }
    public string Nickname { get; set; }
    public string Theme { get; set; }
    public string ChatTheme { get; set; }
    public bool? Unread { get; set; }
    public bool Delivered { get; set; }
    public string MessageText { get; set; }
    public List<UserDTO> User { get; set; }
    public dynamic Active { get; set; }
    public byte[]? FileData { get; set; }
    public DateTime? LastMessageDate { get; set; }
    public bool IsActive { get; set; }
    public string ChatId { get; set; }
    public Guid SenderId { get; set; }
    public Guid ReceiverId { get; set; }
    public string? GroupName { get; set; }
    public int UnReadCount { get; set; }
}


public class ConversationDto
{
    public string ConversationId { get; set; }
    public int UserId { get; set; }
    public DateTime ConversationDate { get; set; }
    public List<MessageDto> Messages { get; set; }
}

public class MessageDto
{
    public int MessageId { get; set; }
    public string MessageText { get; set; }
    public bool IsFromMe { get; set; }
    public DateTime MessageDate { get; set; }
}

public class CreateMessageDto
{
    public Guid? GroupId { get; set; }
    public Guid SenderId { get; set; }
    public Guid ReceiverId { get; set; }
    public string ConversationId { get; set; }
    public string[] Chat { get; set; }
    public bool IsFromMe { get; set; }
    public bool IsGroup { get; set; }
    public List<IFormFile>? Attachments { get; set; }
}
public class GroupMemberDTO
{
    public Guid Id { get; set; }
    public bool IsAdmin { get; set; }
    public bool IsActive { get; set; }
}
public class CreateGroupDTO
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string GroupName { get; set; }
    public string Description { get; set; }
    public List<GroupMemberDTO> Members { get; set; }
}

public class UpdateGroupDTO
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string GroupName { get; set; }
    public string Description { get; set; }
    public bool IsGroup { get; set; }
}

public class RemoveGroupMember
{
    public Guid GroupId { get; set; }
    public Guid Id { get; set; }
    public Guid MemberId { get; set; }
    public Guid UserId { get; set; }
}