const httpStatus = require("http-status");
const catchAsync = require("../utils/catchAsync");
const { conversationService } = require("../services");
const logger = require("../config/logger");

const getConversations = catchAsync(async (req, res) => {
  logger.info("*** Get conversations for user ****");
  const conversations = await conversationService.getConversations(
    req.user._id,
  );
  res.status(200).json(conversations);
});

const createConversation = catchAsync(async (req, res) => {
  logger.info("*** Create conversation ****");
  const { participantId } = req.body;
  const conversation = await conversationService.createOrGetConversation(
    req.user._id,
    participantId,
  );
  res.status(201).json(conversation);
});

const getMessages = catchAsync(async (req, res) => {
  logger.info("*** Get messages for conversation ****");
  const { conversationId } = req.params;
  const messages = await conversationService.getMessages(conversationId);
  res.status(200).json(messages);
});

const sendMessage = catchAsync(async (req, res) => {
  logger.info("*** Send message ****");

  const { conversationId, text } = req.body;

  const message = await conversationService.sendMessage(
    conversationId,
    req.user._id,
    text,
  );

  res.status(201).json(message);
});

const markAsSeen = catchAsync(async (req, res) => {
  logger.info("*** Mark conversation as seen ****");
  const { conversationId } = req.body;
  await conversationService.markMessageAsSeen(conversationId, req.user._id);
  res.status(204).send();
});

module.exports = {
  getConversations,
  createConversation,
  getMessages,
  sendMessage,
  markAsSeen,
};
