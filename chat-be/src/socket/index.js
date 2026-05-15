const roomHandler = require("./room.socket");
const presenceHandler = require("./presense.socket");
const chatHandler = require("./chat.socket");
const callHandler = require("./call.socket");

const registerSocketHandlers = (io, socket) => {
  roomHandler(io, socket);
  presenceHandler(io, socket);
  chatHandler(io, socket);
  callHandler(io, socket);
};

module.exports = registerSocketHandlers;
