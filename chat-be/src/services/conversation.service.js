const logger = require("../config/logger");
const { Conversation, Message } = require("../models");
const { redisClient } = require("../config/redis");

const getConversations = async (userId) => {
  try {
    const conversations = await Conversation.find({ participants: userId })
      .populate("participants", "name status")
      .populate("lastMessage", "text createdAt")
      .sort({ updatedAt: -1 });
    return conversations;
  } catch (error) {
    logger.error("Error fetching conversations:", error);
    throw error;
  }
};

const createOrGetConversation = async (userId, participantId) => {
  try {
    let conversation = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [userId, participantId], $size: 2 },
    })
      .populate("participants", "name status")
      .populate("lastMessage", "text createdAt");

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [userId, participantId],
        isGroup: false,
        unreadCount: 0,
      });
      conversation = await Conversation.findById(conversation._id)
        .populate("participants", "name status")
        .populate("lastMessage", "text createdAt");
    }

    return conversation;
  } catch (error) {
    logger.error("Error creating/getting conversation:", error);
    throw error;
  }
};

const getMessages = async (conversationId) => {
  try {
    const messages = await Message.find({ conversationId })
      .populate("sender", "name")
      .sort({ createdAt: 1 });
    return messages;
  } catch (error) {
    logger.error("Error fetching messages:", error);
    throw error;
  }
};

const sendMessage = async (conversationId, senderId, text) => {
  try {
    // Determine the receiver (the participant who is not the sender)
    const conversation = await Conversation.findById(conversationId);
    const receiverId = conversation.participants.find(
      (p) => p.toString() !== senderId.toString(),
    );

    // If receiver has an active socket (i.e. is online), save as delivered immediately
    const receiverOnline = receiverId
      ? !!(await redisClient.get(`user:${receiverId}`))
      : false;

    const message = await Message.create({
      conversationId,
      sender: senderId,
      text,
      status: receiverOnline ? "delivered" : "sent",
    });

    const updates = conversation.participants
      .map((userId) => {
        console.log(userId, senderId);
        if (userId.toString() !== senderId.toString()) {
          return {
            updateOne: {
              filter: {
                _id: conversationId,
                "unreadCounts.user": userId,
              },
              update: {
                $inc: { "unreadCounts.$.count": 1 },
              },
            },
          };
        }
        return null;
      })
      .filter(Boolean);

    if (updates.length > 0) {
      await Conversation.bulkWrite(updates);
    }

    const conver = await Conversation.findByIdAndUpdate(
      conversationId,
      {
        lastMessage: message._id,
        updatedAt: Date.now(),
        unreadCounts: conversation.participants.map((userId) => ({
          user: userId,
          count:
            userId.toString() === senderId.toString()
              ? 0
              : conversation.unreadCounts.find(
                  (uc) => uc.user.toString() === userId.toString(),
                )?.count + 1 || 1,
        })),
      },
      { new: true },
    )
      .populate("participants", "name status")
      .populate("lastMessage", "text createdAt");

    return await Message.findById(message._id).populate("sender", "name");
  } catch (error) {
    logger.error("Error sending message:", error);
    throw error;
  }
};

const markMessageAsSeen = async (conversationId, userId) => {
  try {
    await Message.updateMany(
      {
        conversationId,
        sender: { $ne: userId },
        status: { $ne: "read" },
      },
      { $set: { status: "read" } },
    );

    await Conversation.updateOne(
      {
        _id: conversationId,
        "unreadCounts.user": userId,
      },
      {
        $set: { "unreadCounts.$.count": 0 },
      },
    );
  } catch (error) {
    logger.error("Error marking messages as seen:", error);
    throw error;
  }
};

const markMessagesDelivered = async (userId) => {
  const conversations = await Conversation.find({
    participants: userId,
  });

  const updatedRooms = [];

  for (const conv of conversations) {
    const updated = await Message.updateMany(
      {
        conversationId: conv._id,
        sender: { $ne: userId },
        status: "sent",
      },
      {
        $set: { status: "delivered" },
      },
    );

    if (updated.modifiedCount > 0) {
      updatedRooms.push(conv._id.toString());
    }
  }

  return updatedRooms;
};

module.exports = {
  getConversations,
  createOrGetConversation,
  getMessages,
  sendMessage,
  markMessageAsSeen,
  markMessagesDelivered
};
