using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;

namespace TCT.LMS.API.NotificationHub
{
    [Authorize]
    public class PushNotificationHub1 : Hub
    {
        // userId -> connectionIds
        private static readonly ConcurrentDictionary<string, HashSet<string>> OnlineUsers = new();
        private static readonly object _lock = new();

        public override async Task OnConnectedAsync()
        {
            string userId = Context.GetHttpContext()?.Request.Query["userId"];

            if (!string.IsNullOrWhiteSpace(userId))
            {
                lock (_lock)
                {
                    if (!OnlineUsers.ContainsKey(userId))
                        OnlineUsers[userId] = new HashSet<string>();

                    OnlineUsers[userId].Add(Context.ConnectionId);
                }

                // Notify everyone user is online
                await Clients.All.SendAsync("UserOnline", userId);

                // Send online list
                await Clients.Caller.SendAsync("UpdateOnlineUsers", OnlineUsers.Keys);
            }

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception exception)
        {
            string disconnectedUser = null;

            lock (_lock)
            {
                foreach (var item in OnlineUsers)
                {
                    if (item.Value.Remove(Context.ConnectionId))
                    {
                        if (item.Value.Count == 0)
                        {
                            OnlineUsers.TryRemove(item.Key, out _);
                            disconnectedUser = item.Key;
                        }
                        break;
                    }
                }
            }

            if (disconnectedUser != null)
            {
                await Clients.All.SendAsync("UserOffline", disconnectedUser);
                await Clients.All.SendAsync("UpdateOnlineUsers", OnlineUsers.Keys);
            }

            await base.OnDisconnectedAsync(exception);
        }

        public static bool IsUserOnline(Guid userId)
        {
            return OnlineUsers.ContainsKey(userId.ToString());
        }

        public static IReadOnlyCollection<string> GetConnectionIds(Guid userId)
        {
            if (OnlineUsers.TryGetValue(userId.ToString(), out var ids))
                return ids.ToList();

            return Array.Empty<string>();
        }

        public static IEnumerable<string> GetOnlineUsers()
        {
            return OnlineUsers.Keys;
        }

        // Sender -> Receiver
        public async Task NotifyDelivered(Guid senderId, Guid receiverId, Guid messageId)
        {
            var connections = GetConnectionIds(senderId);

            await Clients.Clients(connections).SendAsync(
                "MessageDelivered",
                new
                {
                    MessageId = messageId,
                    ReceiverId = receiverId,
                    DeliveredAt = DateTime.UtcNow
                });
        }

        // Receiver opened message
        public async Task NotifyRead(Guid senderId, Guid receiverId, Guid messageId)
        {
            var connections = GetConnectionIds(senderId);

            await Clients.Clients(connections).SendAsync(
                "MessageRead",
                new
                {
                    MessageId = messageId,
                    ReceiverId = receiverId,
                    ReadAt = DateTime.UtcNow
                });
        }

        public async Task SendPushMessage(string user, string message)
        {
            await Clients.All.SendAsync("ReceivePushMessage", user, message);
        }
    }
}