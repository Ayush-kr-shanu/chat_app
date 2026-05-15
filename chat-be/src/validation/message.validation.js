const Joi = require('joi');

const sendMessage = {
  body: Joi.object().keys({
    conversationId: Joi.string().required(),
    text: Joi.string().required(),
  }),
};

module.exports = {
  sendMessage,
};