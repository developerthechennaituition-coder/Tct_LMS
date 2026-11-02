// Chat "Delete for me" / "Delete for everyone" — applies a deletion to the open chat (the GetMessages
// shape: { convo: [{ me, chat1: [message] }] }) the same way the server returns it after a refresh.
// Safe to apply twice (the API response and the realtime MessageDeleted event both arrive).

export const DELETED_MESSAGE_PLACEHOLDER = "This message was deleted.";

export const messageIdOf = (msg) => Number(msg?.messageId ?? msg?.MessageId);

// scope "me": the message is removed from this user's view; a conversation block left empty is dropped.
// scope "everyone": the message stays in place as a placeholder without its text or attachments.
export const applyMessageDeletion = (chat, messageId, scope) => {
  const targetId = Number(messageId);
  if (!chat?.convo?.length || !Number.isInteger(targetId) || targetId <= 0) return chat;

  let changed = false;
  const convo = [];
  chat.convo.forEach((conv) => {
    const messages = conv?.chat1;
    if (!Array.isArray(messages) || !messages.some((m) => messageIdOf(m) === targetId)) {
      convo.push(conv);
      return;
    }
    if (scope === "me") {
      changed = true;
      const remaining = messages.filter((m) => messageIdOf(m) !== targetId);
      if (remaining.length > 0) convo.push({ ...conv, chat1: remaining });
      return;
    }
    const chat1 = messages.map((m) => {
      if (messageIdOf(m) !== targetId || m.isDeleted === true) return m;
      changed = true;
      return { ...m, isDeleted: true, messageText: DELETED_MESSAGE_PLACEHOLDER, fileDatas: [] };
    });
    convo.push(chat1.some((m, idx) => m !== messages[idx]) ? { ...conv, chat1 } : conv);
  });

  return changed ? { ...chat, convo } : chat;
};

// "Delete for everyone" is offered only on the current user's own messages that are not already deleted.
// (The server enforces the same rule: only the conversation's sender may do it.)
export const canDeleteForEveryone = (isMine, msg) => isMine === true && msg?.isDeleted !== true;
