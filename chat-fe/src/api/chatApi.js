import api from "./api";

export const searchUsers = async (query = "") => {
  const res = await api.get(`/users?search=${encodeURIComponent(query)}`);
  return res.data;
};

export const getConversations = async () => {
  const res = await api.get("/conversations");
  return res.data;
};


export const createConversation = async (participantId) => {
  const res = await api.post("/conversations", { participantId });
  return res.data;
};

export const getMessages = async (conversationId) => {
  const res = await api.get(`/messages/${conversationId}`);
  return res.data;
};

export const sendMessage = async (conversationId, text) => {
  const res = await api.post("/messages", { conversationId, text });
  return res.data;
};

export const markConversationSeen = async (conversationId) => {
  await api.post("/conversations/seen", { conversationId });
};
