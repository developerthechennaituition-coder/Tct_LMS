using Microsoft.AspNetCore.SignalR;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Domain.Entities;

public class ChatHub : Hub<IChatClient>
{
    private readonly IChatService _chatService;

    public ChatHub(IChatService chatService)
    {
        _chatService = chatService;
    }

    public async Task JoinChat(long chatId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, chatId.ToString());
    }

    public async Task LeaveChat(string chatId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, chatId);
    }

    public async Task SendMessage(long chatId, string message)
    {
        var userId = new Guid();// Context.User.FindFirst("sub")?.Value;
        var chatMessages = await _chatService.SaveMessageAsync(chatId, userId, message);
        await Clients.Group(chatId.ToString()).ReceiveMessage(chatMessages);
    }
}

public interface IChatClient
{
    Task ReceiveMessage(ChatMessages message);
}