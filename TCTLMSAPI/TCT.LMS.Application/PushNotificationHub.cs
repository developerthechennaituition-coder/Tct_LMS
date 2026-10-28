using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;
using System.Linq;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;
//using Microsoft.EntityFrameworkCore;
//using TCT.LMS.Data.Common;
namespace TCT.LMS.API.NotificationHub
{
    //[Authorize]
    public class PushNotificationHub : Hub
    {
        //private static readonly ConcurrentDictionary<string, HashSet<string>> OnlineUsers = new();
        //private static readonly ConcurrentDictionary<string, HashSet<string>> OnlineUsers = new();
        private static readonly ConcurrentDictionary<Guid, HashSet<string>> OnlineUsers = new();
        private static readonly object _lock = new();

        private readonly IMessageStatusService _messageStatusService;
        private readonly IUserRoleRepository _userRoleRepository;
        public PushNotificationHub(IMessageStatusService messageStatusService, IUserRoleRepository userRoleRepository)
        {
            _messageStatusService = messageStatusService;
            _userRoleRepository = userRoleRepository;
        }

        public override async Task OnConnectedAsync()
        {
            var userIdString = Context.GetHttpContext()?.Request.Query["userId"];

            if (!Guid.TryParse(userIdString, out Guid userId))
            {
                await base.OnConnectedAsync();
                return;
            }

            lock (_lock)
            {
                if (!OnlineUsers.TryGetValue(userId, out var connections))
                {
                    connections = new HashSet<string>();
                    OnlineUsers[userId] = connections;
                }

                connections.Add(Context.ConnectionId);
                //connections.Add(Context.ConnectionId);

                Console.WriteLine("========== SIGNALR CONNECTED ==========");
                Console.WriteLine($"User ID: {userId}");
                Console.WriteLine($"Connection ID: {Context.ConnectionId}");
                Console.WriteLine($"Total connections for user: {connections.Count}");
            } 
            
            // Catches up senders whose group messages were sitting undelivered while this
            // member was offline — without this push, their tick marks only refreshed on
            // the sender's next reload instead of updating as soon as the member reconnects.
            var deliveredNotifications = await _messageStatusService.MarkGroupMessagesDelivered(userId);
            foreach (var senderGroup in deliveredNotifications.GroupBy(n => n.SenderId))
            {
                var senderConnections = GetConnectionIds(senderGroup.Key);
                if (senderConnections.Count == 0) continue;

                await Clients.Clients(senderConnections).SendAsync("MessageDelivered", new
                {
                    MessageIds = senderGroup.Select(n => n.MessageId).Distinct().ToList(),
                    IsGroup = true,
                    DeliveredUserIds = new[] { userId },
                    DeliveredAt = DateTime.UtcNow
                });
            }

            await Clients.All.SendAsync("UserOnline", userId);
            await Clients.Caller.SendAsync("UpdateOnlineUsers", OnlineUsers.Keys);
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            Guid? disconnectedUser = null;

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

            if (disconnectedUser != Guid.Empty && disconnectedUser != null)
            {
                await Clients.All.SendAsync("UserOffline", disconnectedUser);
                await Clients.All.SendAsync("UpdateOnlineUsers", OnlineUsers.Keys);
            }

            await base.OnDisconnectedAsync(exception);
        }

        public static IReadOnlyList<string> GetConnectionIds(Guid userId)
        {
            lock (_lock)
            {
                if (OnlineUsers.TryGetValue(userId, out var ids))
                {
                    return ids.ToList();
                }

                return Array.Empty<string>();
            }
        }

        // Resolves the live connection ids for a set of users so a message can be
        // pushed to exactly those users instead of broadcasting to every connected client.
        public static IReadOnlyList<string> GetConnectionIdsForUsers(IEnumerable<Guid> userIds)
        {
            if (userIds == null) return Array.Empty<string>();
            return userIds.Distinct().SelectMany(GetConnectionIds).Distinct().ToList();
        }

        public static bool IsUserOnline(Guid userId)
        {
            return OnlineUsers.ContainsKey(userId);
        }
        
        public static IEnumerable<Guid> GetOnlineUsers()
        {
            return OnlineUsers.Keys;
        }

        public async Task NotifyDelivered(Guid senderId, Guid receiverId, Guid messageId)
        {
            var connections = GetConnectionIds(senderId);

            if (connections.Any())
            {
                await Clients.Clients(connections).SendAsync(
                    "MessageDelivered",
                    new
                    {
                        MessageId = messageId,
                        ReceiverId = receiverId,
                        DeliveredAt = DateTime.UtcNow
                    });
            }
        }

        public async Task NotifyRead(Guid senderId, Guid receiverId, Guid messageId)
        {
            var connections = GetConnectionIds(senderId);

            if (connections.Any())
            {
                await Clients.Clients(connections).SendAsync(
                    "MessageRead",
                    new
                    {
                        MessageId = messageId,
                        ReceiverId = receiverId,
                        ReadAt = DateTime.UtcNow
                    });
            }
        }

        public async Task SendPushMessage(string user, string message)
        {
            await Clients.All.SendAsync("ReceivePushMessage", user, message);
        }

        // Personal chat: pass the other participant's id as receiverId.
        // Group chat: pass the group id as receiverId and the group's member ids
        // (the caller already has this list loaded) so the hub doesn't need a DB
        // round trip just to know who to notify.
        public async Task Typing(Guid senderId, Guid receiverId, bool isGroup, bool isTyping, List<Guid> memberIds)
        {
            var targetUserIds = isGroup
                ? (memberIds ?? new List<Guid>()).Where(id => id != senderId)
                : new[] { receiverId };

            var connections = GetConnectionIdsForUsers(targetUserIds);
            if (connections.Count == 0) return;

            await Clients.Clients(connections).SendAsync("UserTyping", new
            {
                SenderId = senderId,
                ReceiverId = receiverId,
                IsGroup = isGroup,
                IsTyping = isTyping
            });
        }
        private async Task<bool> CanCallUser(Guid callerId, Guid receiverId)
        {
            var callerRoles = await _userRoleRepository.FindAll(
                x => x.UserId == callerId && x.IsActive
            );

            var receiverRoles = await _userRoleRepository.FindAll(
                x => x.UserId == receiverId && x.IsActive
            );

            bool callerIsTutor = callerRoles.Any(x => x.RoleId == 13);
            bool callerIsStudent = callerRoles.Any(x => x.RoleId == 14);

            bool receiverIsTutor = receiverRoles.Any(x => x.RoleId == 13);
            bool receiverIsStudent = receiverRoles.Any(x => x.RoleId == 14);

            // Tutor cannot call Tutor or Student
            if (callerIsTutor && (receiverIsTutor || receiverIsStudent))
            {
                return false;
            }

            // Student cannot call Tutor or Student
            if (callerIsStudent && (receiverIsTutor || receiverIsStudent))
            {
                return false;
            }

            // All other roles can call everyone
            return true;
        }
        // ==================== VOICE CALL SIGNALING ====================

        public async Task CallUser(Guid receiverId, string callId)
        {
            var senderIdString = Context.GetHttpContext()?.Request.Query["userId"];

            if (!Guid.TryParse(senderIdString, out Guid senderId))
                return;
            // Check Tutor -> Student restriction
            var isAllowed = await CanCallUser(senderId, receiverId);

            if (!isAllowed)
            {
                // Console.WriteLine("❌ Tutor attempted to call a Student.");
                Console.WriteLine(
         $"❌ Call blocked. Caller: {senderId}, Receiver: {receiverId}"
     );
                await Clients.Caller.SendAsync("CallUserResult", new
                {
                    Success = false,
                    CallId = callId,
                    Message = "Tutors cannot call students."
                });

                return;
            }

            var receiverConnections = GetConnectionIds(receiverId);

            if (receiverConnections.Count == 0)
            {
                await Clients.Caller.SendAsync("CallUserResult", new
                {
                    Success = false,
                    CallId = callId,
                    Message = "User is offline"
                });

                return;
            }

            await Clients.Clients(receiverConnections).SendAsync("IncomingCall", new
            {
                CallId = callId,
                CallerId = senderId,
                ReceiverId = receiverId
            });
            // Tell caller that the call request was successfully sent
            await Clients.Caller.SendAsync("CallUserResult", new
            {
                Success = true,
                CallId = callId,
                Message = "Call request sent"
            });
        }


        /* public async Task AcceptCall(Guid callerId, string callId)
         {
             var receiverIdString = Context.GetHttpContext()?.Request.Query["userId"];

             if (!Guid.TryParse(receiverIdString, out Guid receiverId))
                 return;

             var callerConnections = GetConnectionIds(callerId);

             if (callerConnections.Count == 0)
                 return;

             await Clients.Clients(callerConnections).SendAsync("CallAccepted", new
             {
                 CallId = callId,
                 CallerId = callerId,
                 ReceiverId = receiverId
             });
         }
        */
        public async Task AcceptCall(Guid callerId, string callId)
        {
            var receiverIdString = Context.GetHttpContext()?.Request.Query["userId"];

            Console.WriteLine("========== ACCEPT CALL ==========");
            Console.WriteLine($"Caller ID: {callerId}");
            Console.WriteLine($"Call ID: {callId}");
            Console.WriteLine($"Receiver ID from connection: {receiverIdString}");
            Console.WriteLine($"Current Connection ID: {Context.ConnectionId}");

            if (!Guid.TryParse(receiverIdString, out Guid receiverId))
            {
                Console.WriteLine("❌ Could not parse receiver ID.");
                return;
            }

            var callerConnections = GetConnectionIds(callerId);

            Console.WriteLine(
                $"Caller connection count: {callerConnections.Count}"
            );

            foreach (var connectionId in callerConnections)
            {
                Console.WriteLine($"Caller connection: {connectionId}");
            }

            if (callerConnections.Count == 0)
            {
                Console.WriteLine("❌ Caller has no active SignalR connection.");
                return;
            }

            Console.WriteLine("✅ Sending CallAccepted to caller.");

            await Clients.Clients(callerConnections).SendAsync("CallAccepted", new
            {
                CallId = callId,
                CallerId = callerId,
                ReceiverId = receiverId
            });

            Console.WriteLine("✅ CallAccepted sent successfully.");
        }

        public async Task RejectCall(Guid callerId, string callId)
        {
            var receiverIdString = Context.GetHttpContext()?.Request.Query["userId"];

            if (!Guid.TryParse(receiverIdString, out Guid receiverId))
                return;

            var callerConnections = GetConnectionIds(callerId);

            if (callerConnections.Count == 0)
                return;

            await Clients.Clients(callerConnections).SendAsync("CallRejected", new
            {
                CallId = callId,
                CallerId = callerId,
                ReceiverId = receiverId
            });
        }


        public async Task EndCall(Guid otherUserId, string callId)
        {
            var senderIdString = Context.GetHttpContext()?.Request.Query["userId"];

            if (!Guid.TryParse(senderIdString, out Guid senderId))
                return;

            var otherUserConnections = GetConnectionIds(otherUserId);

            if (otherUserConnections.Count == 0)
                return;

            await Clients.Clients(otherUserConnections).SendAsync("CallEnded", new
            {
                CallId = callId,
                SenderId = senderId,
                ReceiverId = otherUserId
            });
        }


        /*public async Task SendCallOffer(
            Guid receiverId,
            string callId,
            string offer)
        {
            var senderIdString = Context.GetHttpContext()?.Request.Query["userId"];

            if (!Guid.TryParse(senderIdString, out Guid senderId))
                return;

            var receiverConnections = GetConnectionIds(receiverId);

            if (receiverConnections.Count == 0)
                return;

            await Clients.Clients(receiverConnections).SendAsync("ReceiveCallOffer", new
            {
                CallId = callId,
                SenderId = senderId,
                ReceiverId = receiverId,
                Offer = offer
            });
        }

        */
        public async Task SendCallOffer(
    Guid receiverId,
    string callId,
    string offer)
        {
            var senderIdString = Context.GetHttpContext()?.Request.Query["userId"];

            Console.WriteLine("========== SEND CALL OFFER ==========");
            Console.WriteLine($"Sender ID from connection: {senderIdString}");
            Console.WriteLine($"Receiver ID: {receiverId}");
            Console.WriteLine($"Call ID: {callId}");
            Console.WriteLine($"Current Connection ID: {Context.ConnectionId}");
            Console.WriteLine($"Offer received: {!string.IsNullOrEmpty(offer)}");

            if (!Guid.TryParse(senderIdString, out Guid senderId))
            {
                Console.WriteLine("❌ Could not parse sender ID.");
                return;
            }

            var receiverConnections = GetConnectionIds(receiverId);

            Console.WriteLine(
                $"Receiver connection count: {receiverConnections.Count}"
            );

            foreach (var connectionId in receiverConnections)
            {
                Console.WriteLine($"Receiver connection: {connectionId}");
            }

            if (receiverConnections.Count == 0)
            {
                Console.WriteLine(
                    $"❌ No SignalR connection found for receiver {receiverId}"
                );

                return;
            }

            Console.WriteLine("✅ Sending ReceiveCallOffer to receiver.");

            await Clients.Clients(receiverConnections).SendAsync(
                "ReceiveCallOffer",
                new
                {
                    CallId = callId,
                    SenderId = senderId,
                    ReceiverId = receiverId,
                    Offer = offer
                });

            Console.WriteLine("✅ ReceiveCallOffer sent successfully.");
        }
        public async Task SendCallAnswer(
            Guid callerId,
            string callId,
            string answer)
        {
            var receiverIdString = Context.GetHttpContext()?.Request.Query["userId"];

            if (!Guid.TryParse(receiverIdString, out Guid receiverId))
                return;

            var callerConnections = GetConnectionIds(callerId);

            if (callerConnections.Count == 0)
                return;

            await Clients.Clients(callerConnections).SendAsync("ReceiveCallAnswer", new
            {
                CallId = callId,
                SenderId = receiverId,
                ReceiverId = callerId,
                Answer = answer
            });
        }


        public async Task SendIceCandidate(
            Guid receiverId,
            string callId,
            string candidate)
        {
            var senderIdString = Context.GetHttpContext()?.Request.Query["userId"];

            if (!Guid.TryParse(senderIdString, out Guid senderId))
                return;

            var receiverConnections = GetConnectionIds(receiverId);

            if (receiverConnections.Count == 0)
                return;

            await Clients.Clients(receiverConnections).SendAsync("ReceiveIceCandidate", new
            {
                CallId = callId,
                SenderId = senderId,
                ReceiverId = receiverId,
                Candidate = candidate
            });
        }
    }
}