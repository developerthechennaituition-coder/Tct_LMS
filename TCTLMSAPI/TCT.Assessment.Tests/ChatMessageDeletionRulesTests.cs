using TCT.LMS.Application.Services;
using TCT.LMS.Domain.Entities;

namespace TCT.Assessment.Tests;

// Chat "Delete for me" / "Delete for everyone" permissions, as enforced by ChatController.DeleteMessageForMe
// and ChatController.DeleteMessage. A message's sender is its conversation's SenderId.
public class ChatMessageDeletionRulesTests
{
    private static readonly Guid Sender = Guid.NewGuid();
    private static readonly Guid Receiver = Guid.NewGuid();
    private static readonly Guid Outsider = Guid.NewGuid();
    private static readonly Guid GroupId = Guid.NewGuid();

    private static Conversation Personal() => new()
    {
        ConversationId = "chat_1", SenderId = Sender, ReceiverId = Receiver, UserId = Sender, ConvType = "Chat"
    };

    private static Conversation Group(bool legacyRow = false) => new()
    {
        ConversationId = "chat_2", SenderId = Sender, ReceiverId = GroupId, UserId = GroupId, ConvType = "GroupChat",
        GroupId = legacyRow ? null : GroupId
    };

    // ─── Delete for me: any participant of the conversation ───

    [Fact]
    public void BothSidesOfAPersonalChatAreParticipants()
    {
        Assert.True(ChatMessageDeletionRules.IsParticipant(Personal(), Sender, isActiveGroupMember: false));
        Assert.True(ChatMessageDeletionRules.IsParticipant(Personal(), Receiver, isActiveGroupMember: false));
    }

    [Fact]
    public void SomeoneOutsideAPersonalChatIsNotAParticipant() =>
        Assert.False(ChatMessageDeletionRules.IsParticipant(Personal(), Outsider, isActiveGroupMember: false));

    [Fact]
    public void ActiveGroupMembersAreParticipantsOfEveryMembersMessages()
    {
        Assert.True(ChatMessageDeletionRules.IsParticipant(Group(), Outsider, isActiveGroupMember: true));
        Assert.False(ChatMessageDeletionRules.IsParticipant(Group(), Outsider, isActiveGroupMember: false));
    }

    [Fact]
    public void AnEmptyUserIdIsNeverAParticipant() =>
        Assert.False(ChatMessageDeletionRules.IsParticipant(Personal(), Guid.Empty, isActiveGroupMember: true));

    // ─── Delete for everyone: only the sender ───

    [Fact]
    public void OnlyTheSenderMayDeleteAPersonalMessageForEveryone()
    {
        Assert.True(ChatMessageDeletionRules.CanDeleteForEveryone(Personal(), Sender));
        Assert.False(ChatMessageDeletionRules.CanDeleteForEveryone(Personal(), Receiver));
        Assert.False(ChatMessageDeletionRules.CanDeleteForEveryone(Personal(), Outsider));
        Assert.False(ChatMessageDeletionRules.CanDeleteForEveryone(Personal(), Guid.Empty));
    }

    [Fact]
    public void OtherGroupMembersMayNotDeleteTheSendersMessageForEveryone()
    {
        Assert.True(ChatMessageDeletionRules.CanDeleteForEveryone(Group(), Sender));
        Assert.False(ChatMessageDeletionRules.CanDeleteForEveryone(Group(), Outsider));
        // The group id sits in ReceiverId; it must never count as a sender.
        Assert.False(ChatMessageDeletionRules.CanDeleteForEveryone(Group(), GroupId));
    }

    // ─── Which group a conversation belongs to (realtime fan-out and membership check) ───

    [Fact]
    public void GroupIdComesFromGroupIdOrFromReceiverIdOnOlderGroupRows()
    {
        Assert.Equal(GroupId, ChatMessageDeletionRules.GroupIdOf(Group()));
        Assert.Equal(GroupId, ChatMessageDeletionRules.GroupIdOf(Group(legacyRow: true)));
        Assert.Null(ChatMessageDeletionRules.GroupIdOf(Personal()));
    }
}
