using TCT.LMS.Domain.Entities;

namespace TCT.LMS.Application.Services;

/// <summary>
/// Who may delete a chat message, used by ChatController.DeleteMessage ("Delete for everyone") and
/// ChatController.DeleteMessageForMe. A message's sender is its conversation's SenderId: every sender
/// has their own Conversations row, in personal chats and in groups.
/// </summary>
public static class ChatMessageDeletionRules
{
    // Stored in Messages.MessageText when a message is deleted for everyone, so no API returns the original text.
    public const string DeletedPlaceholder = "This message was deleted.";

    // Same participant check DeleteMessage already used: either side of a personal chat, or an active group member.
    public static bool IsParticipant(Conversation conversation, Guid userId, bool isActiveGroupMember) =>
        userId != Guid.Empty
        && (conversation.SenderId == userId || conversation.ReceiverId == userId || isActiveGroupMember);

    public static bool CanDeleteForEveryone(Conversation conversation, Guid userId) =>
        userId != Guid.Empty && conversation.SenderId == userId;

    // Group conversations normally carry GroupId; older rows only have the group in ReceiverId.
    public static Guid? GroupIdOf(Conversation conversation) =>
        conversation.GroupId ?? (conversation.ConvType == "GroupChat" ? conversation.ReceiverId : null);
}
