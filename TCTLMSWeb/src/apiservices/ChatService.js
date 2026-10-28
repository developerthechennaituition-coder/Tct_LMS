import { axios } from "../library/axios";

export const getContacts = (userId, role) => {
  return axios.get(`/Chat/get-contacts?userId=${userId}&role=${role}`);
};

// Role-aware contact list for starting a new chat: Students only see
// Operations/Admin/Coordinator; every other role sees everyone.
export const getChatContacts = (userId) => {
  return axios.get(`/Chat/contacts?userId=${userId}`);
};

// TCT Help: support contacts for the logged-in user (identified from the
// access token). Returns [{ id, name, role }].
export const GetHelpContacts = () => {
  return axios.get(`/Chat/help-contacts`);
};

export const PostMessage = (inputData) => {
  return axios.post(`/Chat/messages`, inputData);
};

export const GetLatestMessages = (userId) => {
  return axios.get(`/Chat/getlatestmessages?userId=${userId}`);
};

export const GetGroupContacts = (userId) => {
  return axios.get(`/Chat/getgroupcontacts1?userId=${userId}`);
};

export const GetMessages = (userId1, userId2, isGroup) => {
  return axios.get(`/Chat/getmessagesv1?userId1=${userId1}&userId2=${userId2}&isGroup=${isGroup}&skip=0&take=500`);
};

export const ReadGroupMessages = (groupId, userId) => {
  return axios.post(`/Chat/group/read?groupId=${groupId}&userId=${userId}`);
}

// Marks a personal (non-group) conversation's unread messages as read —
// mirrors ReadGroupMessages, but for 1:1 chats.
export const ReadChatMessages = (conversationId, userId) => {
  return axios.put(`/Chat/markasread?conversationId=${conversationId}&userId=${userId}`);
};

export const GetMessageInfo = (messageId) => {
  return axios.get(`/Chat/message-info?messageId=${messageId}`);
}

export const GetGroupMembers = (groupId) => {
  return axios.get(`/Chat/getgroupmembers?groupId=${groupId}`);
};

export const CreateGroup = (inputData) => {
  return axios.post(`/Chat/CreateGroup`, inputData);
};

export const UpdateGroupName = (inputData) => {
  return axios.post(`/Chat/UpdateGroupName`, inputData);
};

export const DeleteMessage = (messageId, senderId, receiverId) => {
  return axios.post("/Chat/DeleteMessage", { messageId, senderId, receiverId });
};

export const DeleteGroup = (groupId, userId) => {
  return axios.put(`/Chat/DeleteGroup?groupId=${groupId}&userId=${userId}`);
};

export const RemoveGroupMember = (inputData) => {
  return axios.post(`/Chat/RemoveGroupMember`, inputData);
  
};
// ===============================
// Chat Labels
// ===============================

export const GetChatLabels = () => {
  return axios.get(`/Chat/labels`);
};

export const GetChatLabel = (labelId) => {
  return axios.get(`/Chat/labels/${labelId}`);
};

export const CreateChatLabel = (name) => {
  return axios.post(`/Chat/labels`, {
    name: name
  });
};

export const AddChatLabelMember = (labelId, userId = null, groupId = null) => {
  const data = {};

  if (userId) {
    data.userId = userId;
  }

  if (groupId) {
    data.groupId = groupId;
  }

  return axios.post(`/Chat/labels/${labelId}/members`, data);
};

export const RemoveChatLabelMember = (labelId, memberId) => {
  return axios.delete(`/Chat/labels/${labelId}/members/${memberId}`);
};
export const DeleteChatLabel = (labelId) => {
  return axios.delete(`/Chat/labels/${labelId}`);
};
