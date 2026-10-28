using AutoMapper;
using AutoMapper.Execution;
using Azure.Core;
using Microsoft.AspNet.SignalR.Messaging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.VisualBasic;
using System;
using System.Linq;
using System.Net.Mail;
using System.Security.Claims;
using System.Text.RegularExpressions;
using System.Threading.Channels;
using TCT.LMS.API.ChatAppUtils;
using TCT.LMS.API.NotificationHub;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Application.Services;
using TCT.LMS.Data.Common;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Address;
using TCT.LMS.DTOs.ChatApp;
using TCT.LMS.DTOs.DocStorage;
using TCT.LMS.DTOs.Message;
using TCT.LMS.DTOs.Wrappers;
using ChatUserDto = TCT.LMS.DTOs.ChatApp.ChatUserDto;
using Group = TCT.LMS.Domain.Entities.Group;
using MessageDto = TCT.LMS.DTOs.ChatApp.MessageDto;
using Message = TCT.LMS.Domain.Entities.Message;
namespace TCT.LMS.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ChatController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;
    //private readonly Microsoft.AspNet.SignalR.IHubContext<ChatHub> _chatHub;
    private readonly IHubContext<PushNotificationHub> _hubContext;
    private readonly ILogger<ChatController> _logger;
    private readonly IDocumentService _documentService;
    private readonly IMessageStatusService _messageStatusService;
    private readonly IChatLabelRepository _chatLabelRepository;
    //private readonly IValidator<CreateMessageDto> _messageValidator;
    //private readonly IValidator<DTOs.ChatApp.ChatUserDto> _userValidator;

    public ChatController(ApplicationDbContext context, IMapper mapper, IHubContext<PushNotificationHub> chatHub, IDocumentService documentService, ILogger<ChatController> logger, IMessageStatusService messageStatusService,
    IChatLabelRepository chatLabelRepository)
    {
        _context = context;
        _mapper = mapper;
        _hubContext = chatHub;
        _logger = logger;
        _documentService = documentService;
        _messageStatusService = messageStatusService;
        _chatLabelRepository = chatLabelRepository;
    }

    // Get all users
    [HttpGet("users")]
    public async Task<ActionResult<IEnumerable<ChatUserDto>>> GetUsers()
    {
        var users = await _context.ChatUsers
            .ToListAsync();
        return Ok(_mapper.Map<IEnumerable<ChatUserDto>>(users));
    }

    // Get user by id
    [HttpGet("users/{id}")]
    public async Task<ActionResult<ChatUserDto>> GetUser(Guid id)
    {
        var user = await _context.ChatUsers
            .FirstOrDefaultAsync(u => u.UserId == id);

        if (user == null)
            return NotFound();

        return Ok(_mapper.Map<ChatUserDto>(user));
    }

    // Get conversations for a user
    [HttpGet("users/{userId}/conversations")]
    public async Task<ActionResult<IEnumerable<ConversationDto>>> GetUserConversations(Guid userId)
    {
        var conversations = await _context.Conversations
            .Include(c => c.Messages)
            .Where(c => c.UserId == userId)
            .ToListAsync();

        return Ok(_mapper.Map<IEnumerable<ConversationDto>>(conversations));
    }

    // Get specific conversation
    [HttpGet("conversations/{conversationId}")]
    public async Task<ActionResult<ConversationDto>> GetConversation(string conversationId)
    {
        var conversation = await _context.Conversations
            .Include(c => c.Messages)
            .FirstOrDefaultAsync(c => c.ConversationId == conversationId);

        if (conversation == null)
            return NotFound();

        return Ok(_mapper.Map<ConversationDto>(conversation));
    }

    [HttpPost("UpdateGroupName")]
    public async Task<ActionResult> UpdateGroupName(UpdateGroupDTO input)
    {
        Response<Guid> response = new Response<Guid>();
        try
        {
            if (input.IsGroup)
            {
                var _group = _context.Groups.Find(input.Id);
                if (_group != null)
                {
                    _group.Name = input.GroupName;
                    _group.Description = input.Description;
                    _context.Groups.Update(_group);
                    await _context.SaveChangesAsync();
                }
            }
            else
            {
                var _user = _context.User.Find(input.Id);
                if (_user != null)
                {
                    _user.Nickname = input.GroupName;
                    _context.User.Update(_user);
                    await _context.SaveChangesAsync();
                }
            }
            response.Succeeded = true;
        }
        catch (Exception ex)
        {
            response.Succeeded = false;
            response.Message = "Something went wrong.";
        }
        return Ok(response);
    }

    [HttpPost("RemoveGroupMember")]
    public async Task<ActionResult> RemoveGroupMember(RemoveGroupMember input)
    {
        Response<Guid> response = new Response<Guid>();
        try
        {
            var _member = _context.GroupMembers.Where(i => i.GroupId == input.GroupId && i.UserId == input.MemberId).FirstOrDefault();
            if (_member != null)
            {
                _member.IsActive = false;
                _context.GroupMembers.Update(_member);
                await _context.SaveChangesAsync();
            }

            response.Succeeded = true;
        }
        catch (Exception ex)
        {
            response.Succeeded = false;
            response.Message = "Something went wrong.";
        }
        return Ok(response);
    }

    [HttpPost("DeleteMessage")]
    public async Task<ActionResult> DeleteMessage(DeleteChatMessageRequest input)
    {
        if (input.MessageId <= 0) return BadRequest(new { succeeded = false, message = "A valid message ID is required." });
        var callerId = User.Claims
            .Where(c => c.Type.Equals("UserId", StringComparison.OrdinalIgnoreCase)
                     || c.Type == ClaimTypes.NameIdentifier
                     || c.Type.EndsWith("/nameidentifier", StringComparison.OrdinalIgnoreCase)
                     || c.Type.Equals("sub", StringComparison.OrdinalIgnoreCase))
            .Select(c => Guid.TryParse(c.Value, out var value) ? value : Guid.Empty)
            .FirstOrDefault(value => value != Guid.Empty);
        if (callerId == Guid.Empty || callerId != input.SenderId) return Forbid();

        var message = await _context.Messages.FirstOrDefaultAsync(m => m.MessageId == input.MessageId);
        if (message == null) return NotFound(new { succeeded = false, message = "Message was not found." });
        var conversation = await _context.Conversations.FirstOrDefaultAsync(c => c.ConversationId == message.ConversationId);
        if (conversation == null) return NotFound(new { succeeded = false, message = "Conversation was not found." });
        var isParticipant = conversation.SenderId == callerId || conversation.ReceiverId == callerId ||
            (conversation.GroupId.HasValue && await _context.GroupMembers.AnyAsync(g =>
                g.GroupId == conversation.GroupId.Value && g.UserId == callerId && g.IsActive));
        if (!isParticipant) return Forbid();

        message.IsDeleted = true;
        message.ModifiedDate = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        var deleteMessageConnections = PushNotificationHub.GetConnectionIdsForUsers(new[] { callerId, input.ReceiverId });
        if (deleteMessageConnections.Count > 0)
        {
            await _hubContext.Clients.Clients(deleteMessageConnections).SendAsync("ReceivePushMessage", "deletemessages",
                new { SenderId = callerId, ReceiverId = input.ReceiverId });
        }
        return Ok(new { succeeded = true });
    }

    public sealed class DeleteChatMessageRequest
    {
        public int MessageId { get; set; }
        public Guid SenderId { get; set; }
        public Guid ReceiverId { get; set; }
    }


    [HttpPut("DeleteGroup")]
    public async Task<ActionResult> DeleteGroup(Guid groupId, Guid userId)
    {
        Response<Guid> response = new Response<Guid>();
        try
        {
            var _group = _context.Groups.Find(groupId);
            if (_group != null)
            {
                _group.Active = false;
                _group.ModifiedBy = userId;
                _group.ModifiedDate = DateTime.UtcNow;
                _context.Groups.Update(_group);
                await _context.SaveChangesAsync();
            }
            var groupMembers = _context.GroupMembers.Where(s => s.GroupId == _group.Id).Select(s => s.UserId).ToList();
            var deleteGroupConnections = PushNotificationHub.GetConnectionIdsForUsers(groupMembers);
            if (deleteGroupConnections.Count > 0)
            {
                await _hubContext.Clients.Clients(deleteGroupConnections).SendAsync("ReceivePushMessage", "groupdelete", new { SenderId = userId, GroupMember = groupMembers });
            }
            response.Succeeded = true;
        }
        catch (Exception ex)
        {
            response.Succeeded = false;
            response.Message = "Something went wrong.";
        }
        return Ok(response);
    }

    [HttpPost("CreateGroup")]
    public async Task<ActionResult> CreateGroup(CreateGroupDTO input)
    {
        Response<Guid> response = new Response<Guid>();

        if (input.Id == Guid.Empty && (User.IsInRole("Student") || User.IsInRole("Tutor")))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                message = "Students and tutors are not allowed to create groups."
            });
        }

        try
        {
            if (input.Id == Guid.Empty)
            {
                var _group = new Group
                {
                    Active = true,
                    Name = input.GroupName,
                    Delivered = "",
                    Channel = false,
                    Theme = "red",
                    ChatTheme = "green",
                    Created = DateTime.UtcNow,
                    Archive = false,
                    Id = input.Id,
                    Unread = false,
                    CreatedBy = input.UserId
                };
                _context.Groups.Add(_group);
                await _context.SaveChangesAsync();
                input.Id = _group.Id;
                input.Members.Add(new GroupMemberDTO()
                {
                    IsActive = true,
                    Id = input.UserId,
                    IsAdmin = true
                });
            }

            foreach (var item in input.Members)
            {
                var _gm = new GroupMember
                {
                    Id = Guid.NewGuid(),
                    GroupId = input.Id,
                    UserId = item.Id,
                    IsActive = true,
                };
                _context.GroupMembers.Add(_gm);
                await _context.SaveChangesAsync();
            }


            response.Succeeded = true;
        }
        catch (Exception ex)
        {
            response.Message = ex.Message;
            response.Succeeded = false;
        }
        return Ok(response);
    }

    [HttpGet("TestSignalR")]
    public async Task<IActionResult> TestSignalR()
    {
        await _hubContext.Clients.All.SendAsync("ReceivePushMessage", "messages", "TEST");
        return Ok(true);
    }

    //public async Task<bool> IsPhoneNumberShared(Guid userId, string message)
    //{
    //    var lastMessages = await _context.ChatMessages
    //        .Where(x => x.sen == userId)
    //        .OrderByDescending(x => x.CreatedDate)
    //        .Take(5)
    //        .Select(x => x.Message)
    //        .ToListAsync();

    //    var combined = string.Join("", lastMessages) + message;

    //    var digits = Regex.Replace(combined, @"\D", "");

    //    return digits.Length >= 10;
    //}

    // Create new message
    [HttpPost("messages")]
    public async Task<ActionResult> CreateMessage([FromForm] CreateMessageDto input)
    {
        try
        {
            string group = input.IsGroup ? "GroupChat" : "Chat";
            if (input.IsGroup)
            {
                await CreateGroupMessage(input);
                return Ok(true);
            }

            var senderConv = _context.Conversations.Where(i => i.SenderId == input.SenderId && i.ReceiverId == input.ReceiverId && i.ConvType != "GroupChat").AsEnumerable().MaxBy(m => m.ConversationDate);
            var receiverConv = _context.Conversations.Where(i => i.SenderId == input.ReceiverId && i.ReceiverId == input.SenderId && i.ConvType != "GroupChat").AsEnumerable().MaxBy(m => m.ConversationDate);

            if (senderConv == null && receiverConv == null)
            {
                var conversation = new Conversation
                {
                    // This branch only ever runs for a personal (non-group) message —
                    // the group case returns early via CreateGroupMessage above.
                    // Trusting a client-supplied GroupId here let a personal
                    // conversation end up tagged with a real group's id, which
                    // MarkReadForGroup would then match and wrongly mark that
                    // personal chat's messages read whenever the group was opened.
                    GroupId = null,
                    UserId = input.SenderId,
                    ConversationId = $"chat_{_context.Conversations.Count() + 1}",
                    SenderId = input.SenderId,
                    ReceiverId = input.ReceiverId,
                    ConversationDate = DateTime.UtcNow,
                    ConvType = group,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Conversations.Add(conversation);
                await _context.SaveChangesAsync();
                input.ConversationId = conversation.ConversationId;

            }
            else if (senderConv != null && receiverConv == null)
            {
                input.ConversationId = senderConv.ConversationId;
            }
            else if (senderConv == null && receiverConv != null)
            {
                var conversation = new Conversation
                {
                    // This branch only ever runs for a personal (non-group) message —
                    // the group case returns early via CreateGroupMessage above.
                    // Trusting a client-supplied GroupId here let a personal
                    // conversation end up tagged with a real group's id, which
                    // MarkReadForGroup would then match and wrongly mark that
                    // personal chat's messages read whenever the group was opened.
                    GroupId = null,
                    UserId = input.SenderId,
                    ConversationId = $"chat_{_context.Conversations.Count() + 1}",
                    SenderId = input.SenderId,
                    ReceiverId = input.ReceiverId,
                    ConvType = group,
                    ConversationDate = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Conversations.Add(conversation);
                await _context.SaveChangesAsync();
                input.ConversationId = conversation.ConversationId;
            }
            else if (senderConv.ConversationDate < receiverConv.ConversationDate)
            {
                var conversation = new Conversation
                {
                    // This branch only ever runs for a personal (non-group) message —
                    // the group case returns early via CreateGroupMessage above.
                    // Trusting a client-supplied GroupId here let a personal
                    // conversation end up tagged with a real group's id, which
                    // MarkReadForGroup would then match and wrongly mark that
                    // personal chat's messages read whenever the group was opened.
                    GroupId = null,
                    UserId = input.SenderId,
                    ConversationId = $"chat_{_context.Conversations.Count() + 1}",
                    SenderId = input.SenderId,
                    ConvType = group,
                    ReceiverId = input.ReceiverId,
                    ConversationDate = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Conversations.Add(conversation);
                await _context.SaveChangesAsync();
                input.ConversationId = conversation.ConversationId;
            }
            else
            {
                input.ConversationId = senderConv.ConversationId;
            }

            foreach (var item in input.Chat)
            {
                var message = new Domain.Entities.Message
                {
                    Id = Guid.NewGuid(),
                    ConversationId = input.ConversationId,
                    MessageText = item,
                    IsFromMe = input.IsFromMe,
                    MessageDate = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Messages.Add(message);

                _context.MessageStatus.Add(new MessageStatus()
                {
                    UserId = input.ReceiverId,
                    IsDelivered = false,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow,
                    MessageId = message.Id
                });
            }

            await _context.SaveChangesAsync();
            var _message = input.Chat[0];
            var msgs = new List<string>();
            msgs.Add(_message);
            var _conversation = new ChatConversation
            {
                User = new UserDTO(),
                Id = input.ConversationId,
                Me = input.SenderId == input.ReceiverId,
                Date = DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss"),
                Chat = msgs
            };

            if (input.IsGroup)
            {
                var groupMembers = _context.GroupMembers.Where(s => s.GroupId == input.ReceiverId).Select(s => s.UserId).ToList();
                var groupMessageConnections = PushNotificationHub.GetConnectionIdsForUsers(groupMembers);
                if (groupMessageConnections.Count > 0)
                {
                    await _hubContext.Clients.Clients(groupMessageConnections).SendAsync("ReceivePushMessage", group, new { SenderId = input.SenderId, GroupMember = groupMembers });
                }
            }
            else
            {
                var directMessageConnections = PushNotificationHub.GetConnectionIdsForUsers(new[] { input.SenderId, input.ReceiverId });
                if (directMessageConnections.Count > 0)
                {
                    await _hubContext.Clients.Clients(directMessageConnections).SendAsync("ReceivePushMessage", group,
                        new { ReceiverId = input.ReceiverId, SenderId = input.SenderId, message = input.Chat[0] }, _conversation);
                }
            }
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        return Ok(true);
    }

    private async Task<bool> CreateGroupMessage(CreateMessageDto input)
    {
        try
        {
            const string group = "GroupChat";
            var groupReceiver = await _context.Conversations.Where(i => i.ReceiverId == input.ReceiverId && i.ConvType == group).OrderByDescending(i => i.ConversationDate).FirstOrDefaultAsync();
            if (groupReceiver != null)
            {
                await ValidateMessage(groupReceiver.ConversationId, input.SenderId, string.Join(",", input.Chat));
                if (groupReceiver.SenderId == input.SenderId)
                {
                    input.ConversationId = groupReceiver.ConversationId;
                }
                else
                {
                    var conversation = new Conversation
                    {
                        GroupId = input.ReceiverId,
                        UserId = input.ReceiverId,
                        ConversationId = $"chat_{_context.Conversations.Count() + 1}",
                        SenderId = input.SenderId,
                        ReceiverId = input.ReceiverId,
                        ConversationDate = DateTime.UtcNow,
                        ConvType = group,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.Conversations.Add(conversation);
                    await _context.SaveChangesAsync();
                    input.ConversationId = conversation.ConversationId;
                }
            }
            else
            {
                var conversation = new Conversation
                {
                    GroupId = input.ReceiverId,
                    UserId = input.ReceiverId,
                    ConversationId = $"chat_{_context.Conversations.Count() + 1}",
                    SenderId = input.SenderId,
                    ReceiverId = input.ReceiverId,
                    ConversationDate = DateTime.UtcNow,
                    ConvType = group,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Conversations.Add(conversation);
                await _context.SaveChangesAsync();
                input.ConversationId = conversation.ConversationId;
            }

            // Fetch once
            var typeCode = await _context.Type_Code.FirstOrDefaultAsync(s => s.TypeCodeName == "ChatAttachment");

            var messageId = Guid.NewGuid();
            foreach (var item in input.Chat)
            {
                var message = new Domain.Entities.Message
                {
                    Id = messageId,
                    ConversationId = input.ConversationId,
                    MessageText = item,
                    IsFromMe = input.IsFromMe,
                    MessageDate = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Messages.Add(message);

                // message.Id is available here
                if (input.Attachments != null && input.Attachments.Any() && typeCode != null)
                {
                    await _documentService.CreateDocument(
                        new DocumentStorageDto
                        {
                            Files = input.Attachments,
                            Document = new DocumentDto
                            {
                                DocumentName = typeCode.TypeCodeName,
                                DocumentTypeId = typeCode.Id,
                                DocumentDescription = typeCode.TypeCodeDescription,
                                UserId = input.SenderId,
                                ReferenceId = message.Id
                            }
                        });
                }
            }

            var groupMembers = await _context.GroupMembers.Where(s => s.GroupId == input.ReceiverId).Select(s => s.UserId).ToListAsync();

            var statuses = groupMembers.Distinct().Where(x => x != input.SenderId)
                    .Select(x => new MessageStatus
                    {
                        Id = Guid.NewGuid(),
                        MessageId = messageId,
                        CreatedAt = DateTime.UtcNow,
                        DeliveredAt = DateTime.UtcNow,
                        ReadAt = DateTime.UtcNow,
                        UserId = x,
                        IsDelivered = false,
                        IsRead = false
                    });

            _context.MessageStatus.AddRange(statuses);
            await _context.SaveChangesAsync();


            var groupMemberIds = groupMembers.Select(x => x.ToString()).ToList();
            var receiverConnections = PushNotificationHub.GetOnlineUsers().Where(userId => groupMemberIds.Contains(userId.ToString())).ToList();

            if (receiverConnections.Any())
            {
                var deliveredStatuses = await _messageStatusService.MarkDeliveredForOnlineUsers(messageId, receiverConnections);
                await _messageStatusService.MarkDeliveredIfEveryoneOnline(messageId, groupMembers, input.SenderId);

                // The DB write above marks delivery for members who are already online,
                // but without this push the sender's tick marks only refreshed on next
                // reload instead of updating live.
                var deliveredUserIds = deliveredStatuses.Select(s => s.UserId).Distinct().ToList();
                if (deliveredUserIds.Count > 0)
                {
                    var senderConnections = PushNotificationHub.GetConnectionIds(input.SenderId);
                    if (senderConnections.Any())
                    {
                        await _hubContext.Clients.Clients(senderConnections).SendAsync("MessageDelivered", new
                        {
                            MessageIds = new[] { messageId },
                            GroupId = input.ReceiverId,
                            IsGroup = true,
                            DeliveredUserIds = deliveredUserIds,
                            DeliveredAt = DateTime.UtcNow
                        });
                    }
                }
            }

            var groupChatConnections = PushNotificationHub.GetConnectionIdsForUsers(groupMembers);
            if (groupChatConnections.Count > 0)
            {
                await _hubContext.Clients.Clients(groupChatConnections).SendAsync("ReceivePushMessage", group, new
                {
                    SenderId = input.SenderId,
                    ReceiverId = input.ReceiverId,
                    GroupMember = groupMembers
                });
            }

            return true;
        }
        catch
        {
            throw;
        }
    }

    [HttpGet("get-conversation")]
    public async Task<IActionResult> GetChatMessages(Guid excludedUserId)
    {
        // First query: Get list of users except excludedUserId
        var users = await _context.ChatUsers
            .Where(cu => cu.UserId != excludedUserId)
            .Select(cu => new ChatUserDto
            {
                UserId = cu.UserId,
                Name = cu.Name,
                Nickname = cu.Nickname,
                Theme = cu.Theme,
                ChatTheme = cu.ChatTheme,
                IsFavorite = cu.IsFavorite,
                LastActiveStatus = cu.LastActiveStatus,
                UnreadMessages = cu.UnreadMessages,
                IsArchived = cu.IsArchived,
                IsDelivered = cu.IsDelivered
            })
            .Distinct()
            .ToListAsync();

        // Second query: Get conversation IDs for these users
        var conversationIds = await _context.Conversations
            .Where(c => users.Select(u => u.UserId).Contains(c.SenderId) ||
                       users.Select(u => u.UserId).Contains(c.ReceiverId))
            //.Select(c => c.ConversationId)
            //.Distinct()
            .ToListAsync();



        var sideContent = conversationIds.Select(s => s.SenderId).ToArray();
        var sideContent1 = conversationIds.Select(s => s.ReceiverId).ToArray();
        var result = sideContent.Union(sideContent1).Where(s => s != excludedUserId).Distinct();

        dynamic leftData = new object();
        foreach (var item in result)
        {
            var senderConv = _context.Conversations.Where(i => i.SenderId == item || i.ReceiverId == item).AsEnumerable().MaxBy(m => m.ConversationDate);
            var message = _context.Messages.Where(s => s.ConversationId == senderConv.ConversationId).MaxBy(s => s.CreatedAt);

            leftData.Add(new
            {
                Name = _context.ChatUsers.Find(item).Name,
                Nickname = _context.ChatUsers.Find(item).Nickname,
                Theme = _context.ChatUsers.Find(item).Theme,
                ChatTheme = _context.ChatUsers.Find(item).ChatTheme,
                LatestMessageText = message.MessageText
            });
        }

        return Ok(leftData);
    }

    [AllowAnonymous]
    [HttpGet("getmessages")]
    public async Task<IActionResult> GetMessagesById(Guid userId1, Guid userId2, bool isGroup)
    {
        var chatUser = new TCTChatUser();
        try
        {
            var group = _context.Groups.Where(s => s.Id == userId2).FirstOrDefault();
            if (group != null)
            {
                isGroup = true;
            }
            List<Conversation> conversations = new List<Conversation>();
            List<object> leftData = new List<object>();
            if (!isGroup)
            {
                conversations = await _context.Conversations.Where(i => (i.SenderId == userId1 && i.ReceiverId == userId2) || (i.ReceiverId == userId1 && i.SenderId == userId2) && i.ConvType != "GroupChat").ToListAsync();

                conversations = conversations.OrderBy(s => s.CreatedAt).ToList();

                var user = _context.User.Where(s => s.Id == userId2).FirstOrDefault();
                dynamic timeElapsed = "1hr ago";
                if (user?.LastLoggedIn != null)
                {
                    timeElapsed = GetLoggedInTimeStatus(user.LastLoggedIn.Value);
                }

                if (user != null)
                {
                    chatUser.IsActive = true;
                    chatUser.Archive = user.IsArchived;
                    chatUser.Unread = user.UnreadMessages;
                    //chatUser.Date = user.LastActiveDate,
                    chatUser.Id = user.Id;
                    chatUser.Name = user.FullName;
                    chatUser.Nickname = string.IsNullOrEmpty(user.Nickname) ? user.FullName : user.Nickname;
                    chatUser.Theme = user.Theme;
                    chatUser.Fav = true;
                    chatUser.Delivered = true;
                    chatUser.Theme = user.Theme;
                    chatUser.ChatTheme = user.ChatTheme;
                    chatUser.Active = timeElapsed;

                    //var _doc = _context.Documents.Where(s => s.UserId == user.Id).OrderByDescending(s => s.CreatedDate).FirstOrDefault();
                    //if (_doc != null)
                    //{
                    //    var docStorage = _context.DocumentStorage.OrderByDescending(s => s.CreatedDate).FirstOrDefault(s => s.DocumentId == _doc.Id);
                    //    if (docStorage != null)
                    //    {
                    //        var file = await _documentService.ReadFileAsync(docStorage.FilePath);
                    //        chatUser.FileData = file.FileData;
                    //    }
                    //}
                }
            }
            else
            {
                conversations = await _context.Conversations.Where(i => ((i.SenderId == userId1 || i.ReceiverId == userId2) && i.UserId == userId2 && i.ConvType == "GroupChat")).ToListAsync();
                conversations = conversations.OrderBy(s => s.CreatedAt).ToList();
                if (group != null)
                {
                    dynamic timeElapsed = "";
                    if (conversations.Count > 0)
                    {
                        var userId = conversations.MaxBy(s => s.CreatedAt).SenderId;
                        var _user = _context.User.Where(s => s.Id == userId).FirstOrDefault();
                        if (_user.LastLoggedIn != null)
                        {
                            timeElapsed = GetLoggedInTimeStatus(_user.LastLoggedIn.Value);
                        }
                        var _doc = _context.Documents.Where(s => s.UserId == _user.Id).OrderByDescending(s => s.CreatedDate).FirstOrDefault();
                        if (_doc != null)
                        {
                            var docStorage = _context.DocumentStorage.OrderByDescending(s => s.CreatedDate).FirstOrDefault(s => s.DocumentId == _doc.Id);
                            if (docStorage != null)
                            {
                                var file = await _documentService.ReadFileAsync(docStorage.FilePath);
                                chatUser.FileData = file.FileData;
                            }
                        }
                    }
                    chatUser.IsActive = group.Active;
                    chatUser.Group = true;
                    chatUser.Archive = group.Archive;
                    chatUser.Unread = group.Unread;
                    chatUser.Description = group.Description;
                    //chatUser.Date = user.LastActiveDate,
                    chatUser.Id = group.Id;
                    chatUser.Name = group.Name;
                    chatUser.GroupName = group.GroupName;
                    chatUser.Active = timeElapsed;
                    chatUser.Nickname = group.Name;
                    chatUser.Theme = group.Theme;
                    chatUser.Fav = true;
                    chatUser.Delivered = true;
                    chatUser.Theme = group.Theme;
                    chatUser.ChatTheme = group.ChatTheme;


                    //chatUser.Active = group.LastActiveStatus;
                }

                List<UserDTO> users = new List<UserDTO>();
                var _groupMembers = _context.GroupMembers.Where(s => s.GroupId == group.Id && s.IsActive == true).ToList();
                if (_groupMembers != null)
                {
                    foreach (var groupMember in _groupMembers)
                    {
                        byte[]? fileData = null;
                        var _user = _context.User.Find(groupMember.UserId);
                        var _doc = _context.Documents.Where(s => s.UserId == _user.Id).OrderByDescending(s => s.CreatedDate).FirstOrDefault();
                        if (_doc != null)
                        {
                            var docStorage = _context.DocumentStorage.OrderByDescending(s => s.CreatedDate).FirstOrDefault(s => s.DocumentId == _doc.Id);
                            if (docStorage != null)
                            {
                                var file = await _documentService.ReadFileAsync(docStorage.FilePath);
                                fileData = file.FileData;
                            }
                        }

                        users.Add(new UserDTO
                        {
                            Id = _user.Id,
                            FirstName = _user.FirstName,
                            Name = _user.FirstName,
                            LastName = _user.LastName,
                            Theme = _user.Theme,
                            IsActive = true,
                            FileData = fileData
                        });


                    }
                    chatUser.User = users;
                }
            }
            chatUser.Convo = new List<ChatConversation>();
            foreach (var item in conversations)
            {
                var msgs = new List<ChatMessage1>();
                var messages = _context.Messages.Where(s => s.ConversationId == item.ConversationId).OrderBy(s => s.CreatedAt).ToList();
                foreach (var m in messages)
                {
                    List<FileData>? attachmentData = new List<FileData>();
                    var attachment = _context.Documents.Where(s => s.ReferenceId != Guid.Empty && s.ReferenceId == m.Id).OrderByDescending(s => s.CreatedDate).FirstOrDefault();
                    if (attachment != null)
                    {
                        var docStorage = _context.DocumentStorage.OrderByDescending(s => s.CreatedDate).Where(s => s.DocumentId == attachment.Id);
                        if (docStorage != null)
                        {
                            attachmentData = new List<FileData>();
                            foreach (var doc in docStorage)
                            {
                                var file = await _documentService.ReadFileAsync(doc.FilePath);
                                attachmentData.Add(new FileData()
                                {
                                    FileName = doc.FileName,
                                    ContentType = doc.ContentType,
                                    Data = file.FileData
                                });
                            }
                        }
                    }
                    var messageStatus = await _context.MessageStatus.Where(s => s.MessageId == m.Id && s.UserId == item.ReceiverId).FirstOrDefaultAsync();

                    msgs.Add(new ChatMessage1()
                    {
                        Id = m.Id,
                        FileDatas = attachmentData,
                        ConversationId = m.ConversationId,
                        MessageId = m.MessageId,
                        MessageDate = m.MessageDate,
                        MessageText = m.MessageText,
                        ScheduleDetailsId = m.ScheduleDetailsId,
                        IsDeleted = m.IsDeleted,
                        IsFromMe = m.IsFromMe,
                        CreatedAt = m.CreatedAt,
                        IsRead = messageStatus?.IsRead,
                        ReadAt = messageStatus?.ReadAt,
                        IsDelivered = messageStatus?.IsDelivered,
                        DeliveredAt = messageStatus?.DeliveredAt,
                    });

                }

                var _user = _context.User.Where(s => s.Id == item.SenderId).FirstOrDefault();
                var userInfo = new UserDTO()
                {
                    Name = _user?.FirstName,
                    Nickname = string.IsNullOrEmpty(_user?.Nickname) ? _user?.FirstName : _user?.Nickname,
                    Theme = "purple",
                    ChatTheme = "green",
                    Id = _user.Id,
                    FileData = null,
                };

                chatUser.Convo.Add(new ChatConversation
                {
                    User = userInfo,
                    Id = item.ConversationId,
                    Me = item.SenderId == userId1,
                    Date = (messages != null && messages.Count > 0) ? messages.MaxBy(s => s.CreatedAt).CreatedAt.ToString("dd/MM/yyyy HH:mm:ss") : string.Empty,
                    Chat = messages.Select(s => s.MessageText).ToList(),
                    Chat1 = msgs
                });
            }
        }
        catch (Exception ex)
        {
            throw;
        }
        return Ok(chatUser);
    }

    private dynamic GetLoggedInTimeStatus(DateTime dateTime)
    {
        DateTime currentDateTime = DateTime.Now;
        TimeSpan difference = currentDateTime - dateTime;
        dynamic timeElapsed = "1hr ago";
        if (difference.TotalMinutes <= 30)
        {
            timeElapsed = true;
        }
        else if (difference.TotalHours <= 1)
        {
            timeElapsed = true;
        }
        else if (difference.TotalHours <= 2)
        {
            timeElapsed = $"{Math.Round(difference.TotalHours)}hrs";
        }
        else if (difference.TotalHours >= 2 && difference.TotalHours <= 4)
        {
            timeElapsed = $"{Math.Round(difference.TotalHours)}hrs";
        }
        else if (difference.TotalHours >= 4 && difference.TotalHours <= 6)
        {
            timeElapsed = $"{Math.Round(difference.TotalHours)}hrs";
        }
        else if (difference.TotalHours >= 6 && difference.TotalHours <= 8)
        {
            timeElapsed = $"{Math.Round(difference.TotalHours)}hrs";
        }
        else if (difference.TotalHours >= 10 && difference.TotalHours <= 12)
        {
            timeElapsed = $"{Math.Round(difference.TotalHours)}hrs";
        }
        else if (difference.TotalDays >= 1 && difference.TotalDays <= 1)
        {
            timeElapsed = $"{Math.Round(difference.TotalDays)}day";
        }
        else if (difference.TotalDays > 1 && difference.TotalDays <= 7)
        {
            timeElapsed = $"{Math.Round(difference.TotalDays)}day";
        }
        else if (difference.TotalDays >= 7)
        {
            timeElapsed = "1 week";
        }
        else
        {
            timeElapsed = "more than 1 week ago";
        }
        return timeElapsed;
    }
    [HttpGet("getlatestmessages")]
    public async Task<IActionResult> GetLastestMessage(Guid userId)
    {
        try
        {
            List<object> finalResult = new();
            var conversationIds = await _context.Conversations.Where(i => i.SenderId == userId || i.ReceiverId == userId).ToListAsync();
            var groupMembers = (await _context.GroupMembers.Where(x => x.UserId == userId && x.IsActive).ToListAsync()).DistinctBy(x => x.GroupId).ToList();

            var unreadCounts = await (from ms in _context.MessageStatus
                                      join m in _context.Messages on ms.MessageId equals m.Id
                                      join c in _context.Conversations on m.ConversationId equals c.ConversationId
                                      where ms.UserId == userId && !ms.IsRead && c.ConvType == "GroupChat"
                                      group ms by c.GroupId into g
                                      select new
                                      {
                                          GroupId = g.Key,
                                          Count = g.Count()
                                      }).ToDictionaryAsync(x => x.GroupId, x => x.Count);

            // GROUP CHATS
            var groupedChats = new List<UsersChats>();
            foreach (var member in groupMembers)
            {
                var group = await _context.Groups.FirstOrDefaultAsync(s => s.Id == member.GroupId);

                if (group == null)
                    continue;

                DateTime? lastMessageDate = null;
                string messageText = string.Empty;

                var senderConv = _context.Conversations.Where(i => i.ReceiverId == member.GroupId && i.ConvType == "GroupChat").AsEnumerable()
                    .MaxBy(m => m.ConversationDate);
                if (senderConv != null)
                {
                    var message = _context.Messages
                        .Where(s =>
                            s.ConversationId == senderConv.ConversationId &&
                            s.IsDeleted == false)
                        .ToList()
                        .MaxBy(s => s.CreatedAt);

                    if (message != null)
                    {
                        messageText = message.MessageText;
                        lastMessageDate = message.CreatedAt;
                    }
                }

                var users = await (
                    from gm in _context.GroupMembers
                    join u in _context.User on gm.UserId equals u.Id
                    where gm.GroupId == member.GroupId && gm.IsActive
                    select new UserDTO
                    {
                        Id = u.Id,
                        FirstName = u.FirstName,
                        Name = u.FirstName,
                        Nickname = string.IsNullOrEmpty(u.Nickname) ? u.FirstName : u.Nickname,
                        LastName = u.LastName,
                        Theme = u.Theme
                    }).ToListAsync();

                var unreadCount = unreadCounts.TryGetValue(member.GroupId, out var count) ? count : 0;

                groupedChats.Add(new UsersChats
                {
                    Id = group.Id,
                    Group = true,
                    IsActive = group.Active,
                    Name = group.Name,
                    GroupName = group.GroupName,
                    Nickname = string.Empty,
                    Theme = group.Theme,
                    ChatTheme = group.ChatTheme,
                    Delivered = true,
                    MessageText = messageText,
                    LastMessageDate = lastMessageDate,
                    UnReadCount = unreadCount,
                    User = users
                });
            }

            // GROUP BY NAME
            var groupedResult = groupedChats.GroupBy(g => g.Name).Select(g => new
            {
                Name = g.Key,
                Count = g.Count(),
                UnReadCount = g.Sum(x => x.UnReadCount),
                Items = g.ToList()
            }).ToList();

            finalResult.AddRange(groupedResult);

            // =========================
            // INDIVIDUAL CHATS
            // =========================

            var sideContent = conversationIds.Select(s => new
            {
                UserId = s.SenderId,
                ConvType = s.ConvType
            });

            var sideContent1 = conversationIds.Select(s => new
            {
                UserId = s.ReceiverId,
                ConvType = s.ConvType
            });

            var individualUnreadCounts = await (from ms in _context.MessageStatus
                                                 join m in _context.Messages on ms.MessageId equals m.Id
                                                 join c in _context.Conversations on m.ConversationId equals c.ConversationId
                                                 where ms.UserId == userId && !ms.IsRead && c.ConvType != "GroupChat"
                                                 select new
                                                 {
                                                     OtherUserId = c.SenderId == userId ? c.ReceiverId : c.SenderId,
                                                 })
                                                 .GroupBy(x => x.OtherUserId)
                                                 .Select(g => new { OtherUserId = g.Key, Count = g.Count() })
                                                 .ToDictionaryAsync(x => x.OtherUserId, x => x.Count);

            var individualUsers = sideContent.Union(sideContent1).Where(s => s.UserId != userId && s.ConvType != "GroupChat").Distinct().ToList();
            var individualChats = new List<UsersChats>();
            foreach (var item in individualUsers)
            {
                var senderConv = _context.Conversations
                    .Where(i =>
                        (i.SenderId == item.UserId ||
                         i.ReceiverId == item.UserId) &&

                        (i.SenderId == userId ||
                         i.ReceiverId == userId) &&

                        i.ConvType != "GroupChat")
                    .AsEnumerable()
                    .MaxBy(m => m.ConversationDate);

                if (senderConv == null)
                    continue;

                var message = _context.Messages
                    .Where(s =>
                        s.ConversationId ==
                        senderConv.ConversationId)
                    .ToList()
                    .MaxBy(s => s.CreatedAt);

                var user = await _context.User
                    .FindAsync(item.UserId);

                if (user == null)
                    continue;

                var individualUnreadCount = individualUnreadCounts.TryGetValue(item.UserId, out var indCount) ? indCount : 0;

                individualChats.Add(new UsersChats
                {
                    Id = user.Id,
                    ChatId = senderConv.ConversationId,
                    SenderId = senderConv.SenderId,
                    ReceiverId = senderConv.ReceiverId,
                    Group = false,
                    Name = string.IsNullOrEmpty(user.Nickname)
                        ? user.FirstName
                        : user.Nickname,
                    Nickname = user.Nickname,
                    Theme = user.Theme,
                    ChatTheme = user.ChatTheme,
                    Unread = senderConv.Unread,
                    UnReadCount = individualUnreadCount,
                    Delivered = true,
                    MessageText = message?.MessageText,
                    LastMessageDate = message?.CreatedAt,
                    User = new List<UserDTO>()
                });
            }

            finalResult.AddRange(individualChats);

            return Ok(finalResult);
        }
        catch (Exception ex)
        {
            return StatusCode(500, ex.Message);
        }
    }
    [HttpGet("getlatestmessages1")]
    public async Task<IActionResult> GetLastestMessage1(Guid userId)
    {
        List<UsersChats> leftData = new List<UsersChats>();
        try
        {
            var conversationIds = await _context.Conversations.Where(i => i.SenderId == userId || i.ReceiverId == userId).ToListAsync();
            var groupMembers = _context.GroupMembers.Where(s => s.UserId == userId && s.IsActive == true).ToList();
            foreach (var item in groupMembers)
            {
                var dataExists = conversationIds.Exists(s => s.ReceiverId == item.GroupId);
                if (!dataExists)
                {
                    var groupConvs = await _context.Conversations.Where(i => i.ReceiverId == item.GroupId).ToListAsync();
                    if (groupConvs.Count > 0)
                    {
                        conversationIds.AddRange(groupConvs);
                    }
                }
            }

            var sideContent = conversationIds.Select(s => new { UserId = s.SenderId, ConvType = s.ConvType }).ToArray();
            var sideContent1 = conversationIds.Select(s => new { UserId = s.ReceiverId, ConvType = s.ConvType }).ToArray();
            var result = sideContent.Union(sideContent1).Where(s => s.UserId != userId).Distinct().ToList();
            var groupExists = result.Exists(s => s.ConvType == "GroupChat");

            foreach (var item in result)
            {
                if (item.ConvType == "GroupChat")
                {

                    var isExists = leftData.Exists(s => s.Id == item.UserId);
                    if (!isExists)
                    {

                        foreach (var member in groupMembers)
                        {
                            var groupName = _context.Groups.Where(s => s.Id == member.GroupId).FirstOrDefault();
                            DateTime? lastMessageDate = null;
                            string messageText = string.Empty;
                            var senderConv = _context.Conversations.Where(i => i.ReceiverId == member.GroupId && i.ConvType == "GroupChat").AsEnumerable()?.MaxBy(m => m.ConversationDate);
                            if (senderConv != null)
                            {
                                var message = _context.Messages.Where(s => s.ConversationId == senderConv.ConversationId && s.IsDeleted == false).ToList().MaxBy(s => s.CreatedAt);
                                if (message != null)
                                {
                                    messageText = message?.MessageText;
                                    lastMessageDate = message.CreatedAt;
                                }
                            }

                            var user = _context.User.Find(member.UserId);

                            List<UserDTO> users = new List<UserDTO>();
                            var _groupMembers = _context.GroupMembers.Where(s => s.GroupId == member.GroupId && s.IsActive == true).ToList();
                            if (_groupMembers != null)
                            {
                                foreach (var groupMember in _groupMembers)
                                {
                                    var _user = _context.User.Find(groupMember.UserId);
                                    byte[] fileData = null;
                                    var _doc = _context.Documents.Where(s => s.UserId == _user.Id).OrderByDescending(s => s.CreatedDate).FirstOrDefault();
                                    if (_doc != null)
                                    {
                                        var docStorage = _context.DocumentStorage.OrderByDescending(s => s.CreatedDate).FirstOrDefault(s => s.DocumentId == _doc.Id);
                                        if (docStorage != null)
                                        {
                                            var file = await _documentService.ReadFileAsync(docStorage.FilePath);
                                            fileData = file.FileData;
                                        }
                                    }
                                    users.Add(new UserDTO
                                    {
                                        Id = _user.Id,
                                        FirstName = _user.FirstName,
                                        Name = _user.FirstName,
                                        Nickname = string.IsNullOrEmpty(_user.Nickname) ? _user.FirstName : _user.Nickname,
                                        LastName = _user.LastName,
                                        Theme = _user.Theme,
                                        FileData = fileData
                                    });
                                }
                            }

                            leftData.Add(new UsersChats()
                            {
                                Id = member.GroupId,
                                Group = true,
                                IsActive = groupName.Active,
                                Name = groupName.Name,
                                Nickname = string.Empty,
                                Theme = groupName.Theme,
                                ChatTheme = groupName.ChatTheme,
                                Unread = user.UnreadMessages,
                                Delivered = true,
                                MessageText = messageText,
                                LastMessageDate = lastMessageDate,
                                User = users
                            });
                        }
                    }
                }
                else
                {
                    var senderConv = _context.Conversations.Where(i => (i.SenderId == item.UserId || i.ReceiverId == item.UserId) && (i.SenderId == userId || i.ReceiverId == userId) && i.ConvType != "GroupChat").AsEnumerable().MaxBy(m => m.ConversationDate);
                    var message = _context.Messages.Where(s => s.ConversationId == senderConv.ConversationId).ToList().MaxBy(s => s.CreatedAt);

                    bool isUnread = false;
                    if (senderConv.UserId != userId)
                    {
                        isUnread = senderConv.Unread;
                    }
                    dynamic timeElapsed = "1hr ago";
                    if (item.UserId != Guid.Empty)
                    {
                        var user = _context.User.Find(item.UserId);
                        if (user.LastLoggedIn != null)
                        {
                            timeElapsed = GetLoggedInTimeStatus(user.LastLoggedIn.Value);
                        }

                        byte[] fileData = null;
                        var _doc = _context.Documents.Where(s => s.UserId == user.Id).OrderByDescending(s => s.CreatedDate).FirstOrDefault();
                        if (_doc != null)
                        {
                            var docStorage = _context.DocumentStorage.OrderByDescending(s => s.CreatedDate).FirstOrDefault(s => s.DocumentId == _doc.Id);
                            if (docStorage != null)
                            {
                                var file = await _documentService.ReadFileAsync(docStorage.FilePath);
                                fileData = file.FileData;
                            }
                        }

                        leftData.Add(new UsersChats()
                        {
                            Id = user.Id,
                            ChatId = senderConv.ConversationId,
                            SenderId = senderConv.SenderId,
                            ReceiverId = senderConv.ReceiverId,
                            Group = false,
                            Active = timeElapsed,
                            Name = string.IsNullOrEmpty(user.Nickname) ? user.FirstName : user.Nickname,
                            Nickname = user.Nickname,
                            Theme = user.Theme,
                            ChatTheme = user.ChatTheme,
                            Unread = isUnread,
                            Delivered = true,
                            MessageText = message?.MessageText,
                            LastMessageDate = message?.CreatedAt,
                            FileData = fileData,
                            User = new List<UserDTO>()
                        });
                    }
                }
            }
        }
        catch (Exception ex)
        {
            throw;
        }
        //OrderByDescending(s => s.LastMessageDate)
        leftData = leftData.DistinctBy(s => s.Id).ToList();
        return Ok(leftData);
    }


    [HttpGet("getgroupcontacts")]
    public async Task<IActionResult> GetGroupContacts(Guid userId)
    {
        List<object> leftData = new List<object>();
        try
        {
            var groups = (from g in _context.Groups
                          join gm in _context.GroupMembers on g.Id equals gm.GroupId
                          where gm.UserId == userId && g.Active == true
                          select new Domain.Entities.Group()
                          {
                              Name = g.Name,
                              Theme = g.Theme,
                              ChatTheme = g.ChatTheme,
                              Unread = g.Unread,
                              Archive = g.Archive,
                              Created = g.Created,
                              Active = g.Active,
                              Delivered = g.Delivered,
                              Channel = g.Channel,
                              GroupName = g.GroupName,
                              Id = g.Id
                          }).ToList();

            foreach (var group in groups)
            {
                string messageText = string.Empty;
                var senderConv = _context.Conversations.Where(i => i.ReceiverId == group.Id && i.ConvType == "GroupChat").AsEnumerable()?.MaxBy(m => m.ConversationDate);
                if (senderConv != null)
                {
                    var message = _context.Messages.Where(s => s.ConversationId == senderConv.ConversationId).ToList().MaxBy(s => s.CreatedAt);
                    messageText = message?.MessageText;
                }
                var groupMember = _context.GroupMembers.Where(s => s.GroupId == group.Id && s.IsActive == true).ToList();
                List<UserDTO> users = new List<UserDTO>();
                if (groupMember != null)
                {
                    foreach (var gm in groupMember)
                    {
                        var _user = _context.User.Find(gm.UserId);
                        users.Add(new UserDTO
                        {
                            Id = _user.Id,
                            FirstName = _user.FirstName,
                            Name = _user.FirstName,
                            LastName = _user.LastName,
                            Theme = _user.Theme,
                        });
                    }
                }
                List<ChatConversation> Convo = new List<ChatConversation>();
                leftData.Add(new
                {
                    Id = group.Id,
                    Group = true,
                    Archive = false,
                    Channel = false,
                    Name = group.Name,
                    GroupName = group.GroupName,
                    Nickname = string.Empty,
                    Theme = group.Theme,
                    ChatTheme = group.ChatTheme,
                    Unread = group.Unread,
                    Delivered = true,
                    Convo = Convo,
                    MessageText = messageText,
                    User = users
                });
            }
        }
        catch (Exception ex)
        {

        }

        return Ok(leftData);
    }

    [HttpGet("getgroupcontacts1")]
    public async Task<IActionResult> GetGroupContacts1(Guid userId)
    {
        try
        {
            var groups = await (from g in _context.Groups
                                join gm in _context.GroupMembers on g.Id equals gm.GroupId
                                where gm.UserId == userId && g.Active == true
                                select g
            ).Distinct().ToListAsync();

            var result = groups
                .GroupBy(g => g.Name)
                .Select(group => new
                {
                    Name = group.Key,
                    Count = group.Count(),

                    Items = group.Select(g =>
                    {
                        string messageText = string.Empty;

                        var senderConv = _context.Conversations
                            .Where(i =>
                                i.ReceiverId == g.Id &&
                                i.ConvType == "GroupChat")
                            .AsEnumerable()
                            .MaxBy(m => m.ConversationDate);

                        if (senderConv != null)
                        {
                            var message = _context.Messages
                                .Where(s =>
                                    s.ConversationId ==
                                    senderConv.ConversationId)
                                .ToList()
                                .MaxBy(s => s.CreatedAt);

                            messageText = message?.MessageText;
                        }

                        var users = _context.GroupMembers
                            .Where(s =>
                                s.GroupId == g.Id &&
                                s.IsActive)
                            .Join(
                                _context.User,
                                gm => gm.UserId,
                                u => u.Id,
                                (gm, u) => new UserDTO
                                {
                                    Id = u.Id,
                                    FirstName = u.FirstName,
                                    Name = u.FirstName,
                                    LastName = u.LastName,
                                    Theme = u.Theme
                                })
                            .ToList();

                        return new
                        {
                            Id = g.Id,
                            Group = true,
                            Archive = false,
                            Channel = false,
                            Name = g.Name,
                            GroupName = g.GroupName,
                            Nickname = string.Empty,
                            Theme = g.Theme,
                            ChatTheme = g.ChatTheme,
                            Unread = g.Unread,
                            Delivered = true,
                            Convo = new List<ChatConversation>(),
                            MessageText = messageText,
                            User = users
                        };
                    }).ToList()
                })
                .ToList();

            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, ex.Message);
        }
    }

    // Update user
    [HttpPut("users/{id}")]
    public async Task<IActionResult> UpdateUser(int id, ChatUserDto userDto)
    {
        var user = await _context.ChatUsers.FindAsync(id);

        if (user == null)
            return NotFound();

        _mapper.Map(userDto, user);
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    // Archive conversation
    [HttpPatch("users/{userId}/archive/{conversationId}")]
    public async Task<IActionResult> ArchiveConversation(Guid userId, string conversationId)
    {
        var user = await _context.ChatUsers
            .FirstOrDefaultAsync(u => u.UserId == userId);

        if (user == null)
            return NotFound();

        user.IsArchived = true;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return NoContent();
    }


    // Contact list for starting a new 1:1 chat. Students only see staff roles
    // (Operations, Admin, Coordinator) — every other caller role sees everyone,
    // matching the previous (unrestricted) contact picker behavior.
    [HttpGet("contacts")]
    public async Task<IActionResult> GetChatContacts(Guid userId)
    {
        var result = new List<UserDTO>();
        try
        {
            var studentVisibleRoles = new[] { "Operations", "Admin", "Coordinator" };

            var userRoles = _context.Roles.ToList();

            var callerRoleEntity = await _context.UserRole
                .Where(u => u.UserId == userId && u.IsActive)
                .FirstOrDefaultAsync();
            var callerRoleName = callerRoleEntity != null
                ? userRoles.Find(s => s.Id == callerRoleEntity.RoleId)?.RoleName
                : null;

            var users = _context.User.Where(s => s.IsActive == true && s.Id != userId).ToList();

            foreach (var user in users)
            {
                var roleEntity = await _context.UserRole
                    .Where(u => u.UserId == user.Id && u.IsActive)
                    .FirstOrDefaultAsync();
                if (roleEntity == null) continue;

                var role = userRoles.Find(s => s.Id == roleEntity.RoleId);
                if (role == null || role.RoleName == "SuperAdmin") continue;

                if (callerRoleName == "Student" && !studentVisibleRoles.Contains(role.RoleName)) continue;

                result.Add(new UserDTO
                {
                    Id = user.Id,
                    UserCode = user.UserCode,
                    FullName = user.FullName,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    Nickname = user.Nickname,
                    Email = user.Email,
                    IsActive = user.IsActive,
                    Role = role.RoleName
                });
            }

            return Ok(result.OrderBy(x => x.FullName).ToList());
        }
        catch (Exception ex)
        {
            return StatusCode(500, ex.Message);
        }
    }

    // TCT Help: support contacts for the logged-in Tutor/Student, identified
    // from the access token. Coordinator/Operations come from saved assignments
    // (SalesDetails.Coordinator, Sales.Ownership); tutors also get the
    // role-based Payroll team. Returns only id, name, role and email (the email
    // the chat contact list already shows; used by Support -> Help -> Mail).
    [HttpGet("help-contacts")]
    public async Task<IActionResult> GetHelpContacts()
    {
        try
        {
            var callerId = User.Claims
                .Where(c => c.Type.Equals("UserId", StringComparison.OrdinalIgnoreCase)
                         || c.Type == ClaimTypes.NameIdentifier
                         || c.Type.EndsWith("/nameidentifier", StringComparison.OrdinalIgnoreCase)
                         || c.Type.Equals("sub", StringComparison.OrdinalIgnoreCase))
                .Select(c => Guid.TryParse(c.Value, out var value) ? value : Guid.Empty)
                .FirstOrDefault(value => value != Guid.Empty);

            if (callerId == Guid.Empty)
            {
                return Unauthorized(new { message = "Unable to identify the logged-in user." });
            }

            var roles = await _context.Roles.ToListAsync();

            var callerRoleEntity = await _context.UserRole
                .Where(u => u.UserId == callerId && u.IsActive)
                .FirstOrDefaultAsync();
            var callerRoleName = callerRoleEntity != null
                ? roles.Find(s => s.Id == callerRoleEntity.RoleId)?.RoleName
                : null;

            IQueryable<SalesDetails> assignedDetails;
            string[] roleBasedRoleNames;

            if (callerRoleName == "Student")
            {
                var studentIds = _context.Student
                    .Where(s => s.UserId == callerId)
                    .Select(s => s.Id);

                assignedDetails = from sd in _context.SalesDetails
                                  join s in _context.Sales on sd.SalesId equals s.Id
                                  where sd.IsActive && s.StudentId != null && studentIds.Contains(s.StudentId.Value)
                                  select sd;

                // Accounts is not visible to students under the existing chat
                // access policy (see GetChatContacts), so no role-based section.
                roleBasedRoleNames = Array.Empty<string>();
            }
            else if (callerRoleName == "Tutor")
            {
                var tutorIds = _context.Tutor
                    .Where(t => t.UserId == callerId)
                    .Select(t => t.Id);

                var allocatedDetailIds = _context.TutorStudentAllocations
                    .Where(a => a.IsActive && tutorIds.Contains(a.TutorId))
                    .Select(a => a.SalesDetailsId);

                // SalesDetails.TutorId holds either User.Id or Tutor.Id, so match both.
                assignedDetails = _context.SalesDetails
                    .Where(sd => sd.IsActive &&
                        ((sd.TutorId != null && (sd.TutorId == callerId || tutorIds.Contains(sd.TutorId.Value)))
                         || allocatedDetailIds.Contains(sd.Id)));

                roleBasedRoleNames = new[] { "Payroll", "PayrollAdmin" };
            }
            else
            {
                return Ok(new List<object>());
            }

            var assignments = await (from sd in assignedDetails
                                     join s in _context.Sales on sd.SalesId equals s.Id
                                     where s.IsActive
                                     select new { sd.Coordinator, s.Ownership })
                                    .ToListAsync();

            var coordinatorIds = assignments
                .Select(a => a.Coordinator)
                .Where(id => id != Guid.Empty)
                .ToHashSet();
            var operationsIds = assignments
                .Where(a => a.Ownership.HasValue && a.Ownership.Value != Guid.Empty)
                .Select(a => a.Ownership.Value)
                .ToHashSet();
            var assignedIds = coordinatorIds.Union(operationsIds).ToList();

            var roleBasedRoleIds = roles
                .Where(r => r.Id.HasValue && roleBasedRoleNames.Contains(r.RoleName))
                .Select(r => r.Id.Value)
                .ToList();

            var candidates = await (from u in _context.User
                                    join ur in _context.UserRole on u.Id equals ur.UserId
                                    where u.IsActive && ur.IsActive && u.Id != callerId
                                          && (assignedIds.Contains(u.Id) || roleBasedRoleIds.Contains(ur.RoleId))
                                    select new { u.Id, u.FullName, u.FirstName, u.LastName, u.Email, ur.RoleId })
                                   .ToListAsync();

            var contacts = candidates
                .Select(c => new
                {
                    c.Id,
                    Name = !string.IsNullOrWhiteSpace(c.FullName)
                        ? c.FullName.Trim()
                        : $"{c.FirstName} {c.LastName}".Trim(),
                    Role = roles.Find(r => r.Id == c.RoleId)?.RoleName,
                    c.Email
                })
                // Only contacts whose active role matches why they are listed.
                .Where(c => (c.Role == "Coordinator" && coordinatorIds.Contains(c.Id))
                         || (c.Role == "Operations" && operationsIds.Contains(c.Id))
                         || roleBasedRoleNames.Contains(c.Role))
                .GroupBy(c => c.Id)
                .Select(g => g.First())
                .OrderBy(c => c.Role)
                .ThenBy(c => c.Name)
                .ToList();

            return Ok(contacts);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error while loading TCT Help contacts.");
            return StatusCode(500, "Unable to load help contacts.");
        }
    }

    [HttpGet("getgroupmembers")]
    public async Task<IActionResult> GetUsersList(Guid groupId)
    {
        List<UserDTO> result = new List<UserDTO>();
        try
        {
            var userRoles = _context.Roles.ToList();
            var users = new List<User>();
            if (groupId == Guid.Empty)
            {
                users = _context.User.Where(s => s.IsActive == true).ToList();
            }
            else
            {
                users = _context.User.Where(user => !_context.GroupMembers.Where(gm => gm.GroupId == groupId && gm.IsActive == true).Select(gm => gm.UserId).Contains(user.Id)).ToList();
            }
            foreach (var user in users)
            {
                var roleEntity = await _context.UserRole
                                                .Where(u => u.UserId == user.Id && u.IsActive)
                                                .FirstOrDefaultAsync();
                if (roleEntity != null)
                {
                    var role = userRoles.Find(s => s.Id == roleEntity.RoleId);
                    var _user = new UserDTO()
                    {
                        UserCode = user.UserCode,
                        Id = user.Id,
                        FullName = user.FullName,
                        FirstName = user.FirstName,
                        IsSystemUser = user.IsSystemUser,
                        IsActive = user.IsActive,
                        IsAdminUser = user.IsAdminUser,
                        AlternatePhone = user.AlternatePhone,
                        DesignationId = user.DesignationId,
                        DOB = user.DOB,
                        ManagerId = user.ManagerId,
                        Email = user.Email,
                        Gender = user.Gender,
                        Role = role.RoleName,
                        Location = user.Location,
                        JoiningDate = user.JoiningDate,
                        CreatedDate = user.CreatedDate,
                        CreatedBy = user.CreatedBy
                    };
                    try
                    {
                        var _doc = _context.Documents.Where(s => s.UserId == _user.Id).OrderByDescending(s => s.CreatedDate).FirstOrDefault();
                        if (_doc != null)
                        {
                            var docStorage = _context.DocumentStorage.OrderByDescending(s => s.CreatedDate).FirstOrDefault(s => s.DocumentId == _doc.Id);
                            if (docStorage != null)
                            {
                                var file = await _documentService.ReadFileAsync(docStorage.FilePath);
                                _user.FileData = file.FileData;
                            }
                        }
                    }
                    catch (Exception ex) { }
                    result.Add(_user);
                }
            }
            result = result.OrderByDescending(o => o.CreatedDate).ToList();
        }
        catch (Exception ex)
        {
        }
        return Ok(result);
    }

    [AllowAnonymous]
    [HttpPost("group/read")]
    public async Task<IActionResult> MarkGroupRead(Guid groupId, Guid userId)
    {

        await _messageStatusService.MarkGroupMessagesRead(groupId, userId);

        return Ok();
    }

    [HttpPut("markasread")]
    public async Task<IActionResult> MarkAsRead(string conversationId, Guid userId)
    {
        try
        {
            await _messageStatusService.MarkGroupMessagesRead(conversationId, userId);
            return Ok(new Response<bool>
            {
                Succeeded = true,
                Data = true,
                Message = "Messages marked as read."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error while marking group messages as read. ConversationId: {ConversationId}, UserId: {UserId}", conversationId, userId);

            return StatusCode(StatusCodes.Status500InternalServerError,
                new Response<bool>
                {
                    Succeeded = false,
                    Data = false,
                    Message = "An error occurred while marking messages as read."
                });
        }
        return Ok(true);
    }


    [HttpPost("mark-read")]
    public async Task<IActionResult> MarkRead(string conversationId)
    {
        //var messages = await _context.Messages.Where(x => x.ConversationId == conversationId && !x.IsRead).ToListAsync();

        //foreach (var message in messages)
        //{
        //    message.IsRead = true;
        //    message.ReadAt = DateTime.UtcNow;
        //}

        //await _context.SaveChangesAsync();

        return Ok();
    }
    [HttpPost("mark-delivered")]
    public async Task<IActionResult> MarkDelivered(string conversationId)
    {
        //var messages = await _context.Messages.Where(x => x.ConversationId == conversationId && !x.IsDelivered).ToListAsync();

        //foreach (var message in messages)
        //{
        //    message.IsDelivered = true;getScheduleDetailsById
        //    message.DeliveredAt = DateTime.UtcNow;
        //}

        //await _context.SaveChangesAsync();

        return Ok();
    }

    [AllowAnonymous]
    [HttpGet("message-info")]
    public async Task<IActionResult> GetMessageInfo(Guid messageId)
    {
        var result = await _messageStatusService.GetMessageInfo(messageId);
        return Ok(result);
    }
    [AllowAnonymous]
    [HttpGet("getmessagesv1")]
    public async Task<IActionResult> GetMessagesById(Guid userId1, Guid userId2, bool isGroup, int skip = 0, int take = 200, CancellationToken ct = default)
    {
        if (userId1 == Guid.Empty || userId2 == Guid.Empty)
        {
            return BadRequest("userId1 and userId2 are required.");
        }

        const string GroupChatType = "GroupChat";

        try
        {
            var chatUser = new TCTChatUser();

            var group = await _context.Groups.AsNoTracking().FirstOrDefaultAsync(s => s.Id == userId2, ct);
            if (group != null)
            {
                isGroup = true;
            }

            List<Conversation> conversations;

            if (!isGroup)
            {
                conversations = await _context.Conversations.AsNoTracking().Where(i => i.ConvType != GroupChatType && ((i.SenderId == userId1 && i.ReceiverId == userId2) || (i.ReceiverId == userId1 && i.SenderId == userId2))).OrderBy(s => s.CreatedAt).ToListAsync(ct); var user = await _context.User
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.Id == userId2, ct);

                if (user != null)
                {
                    chatUser.IsActive = true;
                    chatUser.Archive = user.IsArchived;
                    chatUser.Unread = user.UnreadMessages;
                    chatUser.Id = user.Id;
                    chatUser.Name = user.FullName;
                    chatUser.Nickname = string.IsNullOrEmpty(user.Nickname) ? user.FullName : user.Nickname;
                    chatUser.Theme = user.Theme;
                    chatUser.Fav = true;
                    chatUser.Delivered = true;
                    chatUser.ChatTheme = user.ChatTheme;
                    chatUser.Active = user.LastLoggedIn.HasValue ? GetLoggedInTimeStatus(user.LastLoggedIn.Value) : "1hr ago";
                }
            }
            else
            {
                if (group == null)
                {
                    return NotFound($"Group {userId2} not found.");
                }

                conversations = await _context.Conversations.AsNoTracking().Where(i => i.UserId == userId2 && i.ConvType == GroupChatType && (i.SenderId == userId1 || i.ReceiverId == userId2)).OrderBy(s => s.CreatedAt).ToListAsync(ct);
                chatUser.IsActive = group.Active;
                chatUser.Group = true;
                chatUser.Archive = group.Archive;
                chatUser.Unread = group.Unread;
                chatUser.Description = group.Description;
                chatUser.Id = group.Id;
                chatUser.Name = group.Name;
                chatUser.GroupName = group.GroupName;
                chatUser.Nickname = group.Name;
                chatUser.Theme = group.Theme;
                chatUser.Fav = true;
                chatUser.Delivered = true;
                chatUser.ChatTheme = group.ChatTheme;
                chatUser.Active = string.Empty;

                if (conversations.Count > 0)
                {
                    var lastSenderId = conversations.MaxBy(s => s.CreatedAt)!.SenderId;
                    var lastSender = await _context.User.AsNoTracking().FirstOrDefaultAsync(s => s.Id == lastSenderId, ct);
                    if (lastSender?.LastLoggedIn != null)
                    {
                        chatUser.Active = GetLoggedInTimeStatus(lastSender.LastLoggedIn.Value);
                    }

                    var avatarByUser = await GetLatestAvatarsAsync(new[] { lastSenderId }, ct);
                    if (avatarByUser.TryGetValue(lastSenderId, out var avatarBytes))
                    {
                        chatUser.FileData = avatarBytes;
                    }
                }

                var groupMembers = await _context.GroupMembers.AsNoTracking().Where(s => s.GroupId == group.Id && s.IsActive).ToListAsync(ct);
                var memberIds = groupMembers.Select(m => m.UserId).ToList();

                var members = await _context.User.AsNoTracking().Where(u => memberIds.Contains(u.Id)).ToListAsync(ct);
                var memberAvatars = await GetLatestAvatarsAsync(memberIds, ct);

                // Each member's active role (active UserRole + active Role), used by Group Info for
                // role labels/colours. Fills the existing UserDTO RoleId/Role fields only.
                var memberRoles = await (from userRole in _context.UserRole.AsNoTracking()
                                         join role in _context.Roles.AsNoTracking() on userRole.RoleId equals role.Id
                                         where memberIds.Contains(userRole.UserId) && userRole.IsActive && role.IsActive
                                         select new { userRole.UserId, role.Id, role.RoleName }).ToListAsync(ct);
                var roleByUser = memberRoles
                    .GroupBy(r => r.UserId)
                    .ToDictionary(g => g.Key, g => g.First());

                chatUser.User = members.Select(u => new UserDTO
                {
                    Id = u.Id,
                    FirstName = u.FirstName,
                    Name = u.FirstName,
                    LastName = u.LastName,
                    Theme = u.Theme,
                    IsActive = true,
                    FileData = memberAvatars.TryGetValue(u.Id, out var data) ? data : null,
                    RoleId = roleByUser.TryGetValue(u.Id, out var memberRole) ? memberRole.Id : (int?)null,
                    Role = memberRole?.RoleName
                }).ToList();
            }

            chatUser.Convo = await BuildConversationsAsync(conversations, userId1, skip, take, ct);

            return Ok(chatUser);
        }
        catch (OperationCanceledException)
        {
            throw; // let cancellation propagate normally, don't log as an error
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetMessagesById failed for userId1={UserId1}, userId2={UserId2}", userId1, userId2);
            return StatusCode(500, "An error occurred while retrieving messages.");
        }
    }

    // ---------------------------------------------------------------------------
    // Builds ChatConversation list for a set of conversations, batching message
    // and attachment fetches instead of doing them per-conversation/per-message.
    // ---------------------------------------------------------------------------
    private async Task<List<ChatConversation>> BuildConversationsAsync(List<Conversation> conversations, Guid userId1, int skip, int take, CancellationToken ct)
    {
        var result = new List<ChatConversation>();
        if (conversations.Count == 0)
        {
            return result;
        }
        take = 3000;
        var conversationIds = conversations.Select(c => c.ConversationId).Distinct().ToList();
        var senderIds = conversations.Select(c => c.SenderId).Distinct().ToList();

        // One query for all messages across all conversations, instead of one query per conversation.
        var allMessages = await _context.Messages
            .AsNoTracking()
            .Where(m => conversationIds.Contains(m.ConversationId))
            .OrderBy(m => m.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync(ct);

        var messageIds = allMessages.Select(m => m.Id).ToList();

        // One query for message read/delivery status, instead of one per message.
        var receiverIds = conversations.Select(c => c.ReceiverId).Distinct().ToList();
        var statuses = await _context.MessageStatus.AsNoTracking().Where(s => messageIds.Contains(s.MessageId) && receiverIds.Contains(s.UserId)).ToListAsync(ct);
        var statusByMessage = statuses.GroupBy(s => s.MessageId).ToDictionary(g => g.Key, g => g.First());
        // One query for all attachment "Documents" rows tied to any of these messages.
        var attachmentDocs = await _context.Documents.AsNoTracking().Where(d => d.ReferenceId != Guid.Empty && messageIds.Contains(d.ReferenceId.Value)).ToListAsync(ct);
        var attachmentDocIds = attachmentDocs.Select(d => d.Id).ToList();

        // One query for all storage rows for those documents.
        var storageRows = await _context.DocumentStorage.AsNoTracking().Where(ds => attachmentDocIds.Contains(ds.DocumentId)).OrderByDescending(ds => ds.CreatedDate).ToListAsync(ct);
        // Read attachment file bytes concurrently (bounded) rather than sequentially awaiting each one.
        var storageByDocId = storageRows.GroupBy(s => s.DocumentId).ToDictionary(g => g.Key, g => g.ToList());
        var fileBytesByPath = await ReadFilesAsync(storageRows.Select(s => s.FilePath).Distinct(), ct);

        var attachmentsByMessageId = attachmentDocs.GroupBy(d => d.ReferenceId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(d => d.CreatedDate)
            .Take(1).SelectMany(d => storageByDocId.TryGetValue(d.Id, out var rows) ? rows : new List<DocumentStorage>())
                    .Select(ds => new FileData
                    {
                        FileName = ds.FileName,
                        ContentType = ds.ContentType,
                        Data = fileBytesByPath.TryGetValue(ds.FilePath, out var bytes) ? bytes : null
                    })
                    .ToList());

        // One query for all senders instead of one per conversation.
        var senders = await _context.User
            .AsNoTracking()
            .Where(u => senderIds.Contains(u.Id))
            .ToListAsync(ct);
        var senderById = senders.ToDictionary(u => u.Id);

        var messagesByConversation = allMessages.GroupBy(m => m.ConversationId).ToDictionary(g => g.Key, g => g.ToList());

        foreach (var item in conversations)
        {
            var messages = messagesByConversation.TryGetValue(item.ConversationId, out var msgList) ? msgList : new List<Message>();

            var msgs = messages.Select(m => new ChatMessage1
            {
                Id = m.Id,
                FileDatas = attachmentsByMessageId.TryGetValue(m.Id, out var files) ? files : new List<FileData>(),
                ConversationId = m.ConversationId,
                MessageId = m.MessageId,
                MessageDate = m.MessageDate,
                MessageText = m.MessageText,
                ScheduleDetailsId = m.ScheduleDetailsId,
                IsDeleted = m.IsDeleted,
                IsFromMe = m.IsFromMe,
                CreatedAt = m.CreatedAt,
                IsRead = statusByMessage.TryGetValue(m.Id, out var st) ? st.IsRead : null,
                ReadAt = statusByMessage.TryGetValue(m.Id, out var st2) ? st2.ReadAt : null,
                IsDelivered = statusByMessage.TryGetValue(m.Id, out var st3) ? st3.IsDelivered : null,
                DeliveredAt = statusByMessage.TryGetValue(m.Id, out var st4) ? st4.DeliveredAt : null,
            }).ToList();

            senderById.TryGetValue(item.SenderId, out var senderUser);

            var userInfo = new UserDTO
            {
                Name = senderUser?.FirstName,
                Nickname = string.IsNullOrEmpty(senderUser?.Nickname) ? senderUser?.FirstName : senderUser?.Nickname,
                Theme = "purple",
                ChatTheme = "green",
                Id = senderUser?.Id ?? Guid.Empty,
                FileData = null,
            };

            result.Add(new ChatConversation
            {
                User = userInfo,
                Id = item.ConversationId,
                Me = item.SenderId == userId1,
                Date = messages.Count > 0
                    ? messages.MaxBy(s => s.CreatedAt)!.CreatedAt.ToString("dd/MM/yyyy HH:mm:ss")
                    : string.Empty,
                Chat1 = msgs
            });
        }

        return result;
    }

    // ---------------------------------------------------------------------------
    // Fetches the single most recent avatar file (bytes) per user id, batched.
    // ---------------------------------------------------------------------------
    private async Task<Dictionary<Guid, byte[]>> GetLatestAvatarsAsync(IEnumerable<Guid> userIds, CancellationToken ct)
    {
        var ids = userIds.Distinct().ToList();
        if (ids.Count == 0)
        {
            return new Dictionary<Guid, byte[]>();
        }

        var docs = await _context.Documents
            .AsNoTracking()
            .Where(d => ids.Contains(d.UserId))
            .ToListAsync(ct);

        var latestDocByUser = docs
            .GroupBy(d => d.UserId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(d => d.CreatedDate).First());

        var docIds = latestDocByUser.Values.Select(d => d.Id).ToList();

        var storage = await _context.DocumentStorage
            .AsNoTracking()
            .Where(s => docIds.Contains(s.DocumentId))
            .ToListAsync(ct);

        var latestStorageByDoc = storage
            .GroupBy(s => s.DocumentId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(s => s.CreatedDate).First());

        var fileBytesByPath = await ReadFilesAsync(latestStorageByDoc.Values.Select(s => s.FilePath).Distinct(), ct);

        var result = new Dictionary<Guid, byte[]>();
        foreach (var (userId, doc) in latestDocByUser)
        {
            if (latestStorageByDoc.TryGetValue(doc.Id, out var storageRow) &&
                fileBytesByPath.TryGetValue(storageRow.FilePath, out var bytes))
            {
                result[userId] = bytes;
            }
        }

        return result;
    }

    // ---------------------------------------------------------------------------
    // Reads multiple files concurrently with bounded parallelism instead of
    // sequential awaits in a loop.
    // ---------------------------------------------------------------------------
    private async Task<Dictionary<string, byte[]>> ReadFilesAsync(IEnumerable<string> paths, CancellationToken ct)
    {
        var distinctPaths = paths.Where(p => !string.IsNullOrEmpty(p)).Distinct().ToList();
        var result = new Dictionary<string, byte[]>();
        if (distinctPaths.Count == 0)
        {
            return result;
        }

        using var throttle = new SemaphoreSlim(8); // cap concurrent file/blob reads
        var tasks = distinctPaths.Select(async path =>
        {
            await throttle.WaitAsync(ct);
            try
            {
                var file = await _documentService.ReadFileAsync(path);
                return (path, file.FileData);
            }
            finally
            {
                throttle.Release();
            }
        });

        var completed = await Task.WhenAll(tasks);
        foreach (var (path, data) in completed)
        {
            if (data != null)
            {
                result[path] = data;
            }
        }

        return result;
    }

    private async Task ValidateMessage(string conversationId, Guid senderId, string message)
    {
        var conversation = await _context.Conversations.FirstOrDefaultAsync(x => x.ConversationId == conversationId && x.SenderId == senderId);

        if (conversation == null)
            return;

        var messages = await _context.Messages
            .Where(x => x.ConversationId == conversationId && !x.IsDeleted)
            .OrderByDescending(x => x.CreatedAt)
            .Take(5)
            .Select(x => x.MessageText)
            .ToListAsync();

        var msg = string.Concat(message, string.Join(",", messages));

        if (ContainsRestrictedContent(msg))
        {
            throw new Exception("Sharing phone numbers, emails, or external links is not allowed.");
        }
    }

    private bool ContainsRestrictedContent(string message)
    {
        if (string.IsNullOrWhiteSpace(message))
            return false;

        // Phone number detection (10+ digits even if spaced or dashed)
        var phonePattern = @"\b(\+?\d{1,3}[- ]?)?\d{5,}[- ]?\d{5,}\b";

        // Email detection
        var emailPattern = @"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}";

        // URL / social media detection
        var urlPattern = @"(http[s]?:\/\/|www\.)\S+";

        // Social media keywords
        var socialKeywords = new[]
        {
        "whatsapp","telegram","instagram","facebook",
        "snapchat","discord","linkedin","t.me","wa.me"
        };

        if (Regex.IsMatch(message, phonePattern, RegexOptions.IgnoreCase) || ContainsPhoneNumber(message))
            return true;

        if (Regex.IsMatch(message, emailPattern, RegexOptions.IgnoreCase))
            return true;

        if (Regex.IsMatch(message, urlPattern, RegexOptions.IgnoreCase))
            return true;

        foreach (var word in socialKeywords)
        {
            if (message.Contains(word, StringComparison.OrdinalIgnoreCase))
                return true;
        }

        return false;
    }
    private bool ContainsPhoneNumber(string message)
    {
        message = ConvertWordsToDigits(message);
        var digits = ExtractDigits(message);
        return digits.Length >= 3; // prevent splitting numbers across messages
    }

    private string ConvertWordsToDigits(string text)
    {
        var numberWords = new Dictionary<string, string>
    {
        {"zero","0"},{"one","1"},{"two","2"},{"three","3"},{"four","4"},
        {"five","5"},{"six","6"},{"seven","7"},{"eight","8"},{"nine","9"}
    };

        foreach (var item in numberWords)
        {
            text = Regex.Replace(
                text,
                $@"\b{item.Key}\b",
                item.Value,
                RegexOptions.IgnoreCase
            );
        }

        return text;
    }
    private string ExtractDigits(string text)
    {
        return Regex.Replace(text, @"\D", "");
    }
    // =========================================================
    // CHAT LABELS
    // =========================================================

    [HttpPost("labels")]
    public async Task<IActionResult> CreateChatLabel([FromBody] ChatLabel label)
    {
        try
        {
            var callerId = User.Claims
                .Where(c => c.Type.Equals("UserId", StringComparison.OrdinalIgnoreCase)
                         || c.Type == ClaimTypes.NameIdentifier
                         || c.Type.EndsWith("/nameidentifier", StringComparison.OrdinalIgnoreCase)
                         || c.Type.Equals("sub", StringComparison.OrdinalIgnoreCase))
                .Select(c => Guid.TryParse(c.Value, out var value) ? value : Guid.Empty)
                .FirstOrDefault(value => value != Guid.Empty);

            if (callerId == Guid.Empty)
            {
                return Unauthorized(new
                {
                    message = "Unable to identify the logged-in user."
                });
            }

            if (string.IsNullOrWhiteSpace(label.Name))
            {
                return BadRequest(new
                {
                    message = "Label name is required."
                });
            }

            var newLabel = new ChatLabel
            {
                Id = Guid.NewGuid(),
                Name = label.Name.Trim(),
                CreatedBy = callerId,
                CreatedDate = DateTime.UtcNow,
                IsActive = true
            };

            var createdLabel =
                await _chatLabelRepository.CreateLabelAsync(newLabel);

            return Ok(createdLabel);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error while creating chat label.");

            return StatusCode(500, new
            {
                message = "Unable to create chat label."
            });
        }
    }


    [HttpGet("labels")]
    public async Task<IActionResult> GetChatLabels()
    {
        try
        {
            var callerId = User.Claims
                .Where(c => c.Type.Equals("UserId", StringComparison.OrdinalIgnoreCase)
                         || c.Type == ClaimTypes.NameIdentifier
                         || c.Type.EndsWith("/nameidentifier", StringComparison.OrdinalIgnoreCase)
                         || c.Type.Equals("sub", StringComparison.OrdinalIgnoreCase))
                .Select(c => Guid.TryParse(c.Value, out var value) ? value : Guid.Empty)
                .FirstOrDefault(value => value != Guid.Empty);

            if (callerId == Guid.Empty)
            {
                return Unauthorized(new
                {
                    message = "Unable to identify the logged-in user."
                });
            }

            var labels = await _chatLabelRepository.GetLabelsAsync(callerId);

            return Ok(labels);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error while getting chat labels.");

            return StatusCode(500, new
            {
                message = "Unable to get chat labels."
            });
        }
    }


    [HttpGet("labels/{labelId}")]
    public async Task<IActionResult> GetChatLabel(Guid labelId)
    {
        try
        {
            if (labelId == Guid.Empty)
            {
                return BadRequest(new
                {
                    message = "A valid label ID is required."
                });
            }

            var callerId = User.Claims
                .Where(c => c.Type.Equals("UserId", StringComparison.OrdinalIgnoreCase)
                         || c.Type == ClaimTypes.NameIdentifier
                         || c.Type.EndsWith("/nameidentifier", StringComparison.OrdinalIgnoreCase)
                         || c.Type.Equals("sub", StringComparison.OrdinalIgnoreCase))
                .Select(c => Guid.TryParse(c.Value, out var value) ? value : Guid.Empty)
                .FirstOrDefault(value => value != Guid.Empty);

            if (callerId == Guid.Empty)
            {
                return Unauthorized(new
                {
                    message = "Unable to identify the logged-in user."
                });
            }

            var label = await _chatLabelRepository.GetLabelByIdAsync(labelId);

            if (label == null)
            {
                return NotFound(new
                {
                    message = "Label not found."
                });
            }

            if (label.CreatedBy != callerId)
            {
                return Forbid();
            }

            var members =
                await _chatLabelRepository.GetLabelMembersAsync(labelId);

            return Ok(new
            {
                label,
                members
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error while getting chat label.");

            return StatusCode(500, new
            {
                message = "Unable to get chat label."
            });
        }
    }
    [HttpDelete("labels/{labelId}")]
    public async Task<IActionResult> DeleteLabel(Guid labelId)
    {
        try
        {
            if (labelId == Guid.Empty)
            {
                return BadRequest(new
                {
                    message = "A valid label ID is required."
                });
            }

            var callerId = User.Claims
                .Where(c => c.Type.Equals("UserId", StringComparison.OrdinalIgnoreCase)
                         || c.Type == ClaimTypes.NameIdentifier
                         || c.Type.EndsWith("/nameidentifier", StringComparison.OrdinalIgnoreCase)
                         || c.Type.Equals("sub", StringComparison.OrdinalIgnoreCase))
                .Select(c => Guid.TryParse(c.Value, out var value) ? value : Guid.Empty)
                .FirstOrDefault(value => value != Guid.Empty);

            if (callerId == Guid.Empty)
            {
                return Unauthorized(new
                {
                    message = "Unable to identify the logged-in user."
                });
            }

            var label = await _chatLabelRepository.GetLabelByIdAsync(labelId);

            if (label == null)
            {
                return NotFound(new
                {
                    message = "Label not found."
                });
            }

            // Only the owner can delete the label.
            if (label.CreatedBy != callerId)
            {
                return Forbid();
            }

            var deleted = await _chatLabelRepository.DeleteLabelAsync(labelId);

            if (!deleted)
            {
                return NotFound(new
                {
                    message = "Label not found."
                });
            }

            return Ok(new
            {
                succeeded = true,
                message = "Label deleted successfully."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error while deleting chat label.");

            return StatusCode(500, new
            {
                message = "Unable to delete chat label."
            });
        }
    }


   


    [HttpPost("labels/{labelId}/members")]
    public async Task<IActionResult> AddChatLabelMember(
        Guid labelId,
        [FromBody] ChatLabelMember member)
    {
        try
        {
            if (labelId == Guid.Empty)
            {
                return BadRequest(new
                {
                    message = "A valid label ID is required."
                });
            }

            if (member.UserId == null && member.GroupId == null)
            {
                return BadRequest(new
                {
                    message = "Either UserId or GroupId is required."
                });
            }

            if (member.UserId != null && member.GroupId != null)
            {
                return BadRequest(new
                {
                    message = "Only one of UserId or GroupId can be provided."
                });
            }

            var callerId = User.Claims
                .Where(c => c.Type.Equals("UserId", StringComparison.OrdinalIgnoreCase)
                         || c.Type == ClaimTypes.NameIdentifier
                         || c.Type.EndsWith("/nameidentifier", StringComparison.OrdinalIgnoreCase)
                         || c.Type.Equals("sub", StringComparison.OrdinalIgnoreCase))
                .Select(c => Guid.TryParse(c.Value, out var value) ? value : Guid.Empty)
                .FirstOrDefault(value => value != Guid.Empty);

            if (callerId == Guid.Empty)
            {
                return Unauthorized(new
                {
                    message = "Unable to identify the logged-in user."
                });
            }

            var label = await _chatLabelRepository.GetLabelByIdAsync(labelId);

            if (label == null)
            {
                return NotFound(new
                {
                    message = "Label not found."
                });
            }

            if (label.CreatedBy != callerId)
            {
                return Forbid();
            }

            var existingMembers =
                await _chatLabelRepository.GetLabelMembersAsync(labelId);

            var alreadyExists = existingMembers.Any(x =>
                (member.UserId.HasValue &&
                 x.UserId == member.UserId &&
                 x.IsActive)
                ||
                (member.GroupId.HasValue &&
                 x.GroupId == member.GroupId &&
                 x.IsActive));

            if (alreadyExists)
            {
                return BadRequest(new
                {
                    message = "This user or group is already added to the label."
                });
            }

            var newMember = new ChatLabelMember
            {
                Id = Guid.NewGuid(),
                LabelId = labelId,
                UserId = member.UserId,
                GroupId = member.GroupId,
                CreatedDate = DateTime.UtcNow,
                IsActive = true
            };

            var createdMember =
                await _chatLabelRepository.AddMemberAsync(newMember);

            return Ok(createdMember);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error while adding member to chat label.");

            return StatusCode(500, new
            {
                message = "Unable to add member to chat label."
            });
        }
    }


    [HttpDelete("labels/{labelId}/members/{memberId}")]
    public async Task<IActionResult> RemoveChatLabelMember(
        Guid labelId,
        Guid memberId)
    {
        try
        {
            if (labelId == Guid.Empty || memberId == Guid.Empty)
            {
                return BadRequest(new
                {
                    message = "A valid label ID and member ID are required."
                });
            }

            var callerId = User.Claims
                .Where(c => c.Type.Equals("UserId", StringComparison.OrdinalIgnoreCase)
                         || c.Type == ClaimTypes.NameIdentifier
                         || c.Type.EndsWith("/nameidentifier", StringComparison.OrdinalIgnoreCase)
                         || c.Type.Equals("sub", StringComparison.OrdinalIgnoreCase))
                .Select(c => Guid.TryParse(c.Value, out var value) ? value : Guid.Empty)
                .FirstOrDefault(value => value != Guid.Empty);

            if (callerId == Guid.Empty)
            {
                return Unauthorized(new
                {
                    message = "Unable to identify the logged-in user."
                });
            }

            var label = await _chatLabelRepository.GetLabelByIdAsync(labelId);

            if (label == null)
            {
                return NotFound(new
                {
                    message = "Label not found."
                });
            }

            if (label.CreatedBy != callerId)
            {
                return Forbid();
            }

            var removed =
                await _chatLabelRepository.RemoveMemberAsync(
                    labelId,
                    memberId);

            if (!removed)
            {
                return NotFound(new
                {
                    message = "Label member not found."
                });
            }

            return Ok(new
            {
                succeeded = true,
                message = "Member removed from label."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error while removing member from chat label.");

            return StatusCode(500, new
            {
                message = "Unable to remove member from chat label."
            });
        } }
    }

