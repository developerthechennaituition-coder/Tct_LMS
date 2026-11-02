import { applyMessageDeletion, canDeleteForEveryone, DELETED_MESSAGE_PLACEHOLDER } from "./chatMessageDeletion";

const file = { fileName: "a.png", contentType: "image/png", data: "AAAA" };
const chat = () => ({
  id: "other-user",
  convo: [
    { id: "chat_1", me: true, chat1: [{ messageId: 1, messageText: "hi" }, { messageId: 2, messageText: "secret", fileDatas: [file] }] },
    { id: "chat_2", me: false, chat1: [{ messageId: 3, messageText: "only one" }] },
  ],
});

test("delete for me removes only that message from the current view", () => {
  const input = chat();
  const result = applyMessageDeletion(input, 2, "me");
  expect(result.convo[0].chat1.map((m) => m.messageId)).toEqual([1]);
  expect(result.convo[1]).toBe(input.convo[1]);
  expect(input.convo[0].chat1).toHaveLength(2);
});

test("delete for me drops a conversation block left with no messages", () => {
  const result = applyMessageDeletion(chat(), 3, "me");
  expect(result.convo.map((c) => c.id)).toEqual(["chat_1"]);
});

test("delete for everyone keeps the message as a placeholder without its text or attachments", () => {
  const result = applyMessageDeletion(chat(), "2", "everyone");
  const msg = result.convo[0].chat1[1];
  expect(msg).toEqual({ messageId: 2, isDeleted: true, messageText: DELETED_MESSAGE_PLACEHOLDER, fileDatas: [] });
  expect(result.convo[0].chat1[0]).toEqual({ messageId: 1, messageText: "hi" });
});

test("applying the same deletion twice or an unknown message changes nothing", () => {
  const once = applyMessageDeletion(chat(), 2, "everyone");
  expect(applyMessageDeletion(once, 2, "everyone")).toBe(once);
  const input = chat();
  expect(applyMessageDeletion(input, 99, "me")).toBe(input);
  expect(applyMessageDeletion(input, undefined, "me")).toBe(input);
  expect(applyMessageDeletion({}, 1, "me")).toEqual({});
  expect(applyMessageDeletion(null, 1, "me")).toBeNull();
});

test("delete for everyone is offered only on the user's own, not yet deleted messages", () => {
  expect(canDeleteForEveryone(true, { messageId: 1 })).toBe(true);
  expect(canDeleteForEveryone(false, { messageId: 1 })).toBe(false);
  expect(canDeleteForEveryone(true, { messageId: 1, isDeleted: true })).toBe(false);
});
