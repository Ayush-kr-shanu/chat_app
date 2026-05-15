const logger = require("../config/logger");

const callHandler = (io, socket) => {

  socket.on("call_user", ({ to, from, offer, callType }) => {
    logger.info("call_user event:", { to, from, callType });
    try {
      io.to(String(to)).emit("incoming_call", { from, offer, callType });
      logger.info(`📞 ${callType} call from ${from} → ${to}`);
    } catch (err) {
      logger.error("Call user error:", err);
    }
  });

  socket.on("answer_call", ({ to, answer }) => {
    try {
      io.to(String(to)).emit("call_answered", { answer });
    } catch (err) {
      logger.error("Answer call error:", err);
    }
  });

  socket.on("ice_candidate", ({ to, candidate }) => {
    try {
      io.to(String(to)).emit("ice_candidate", { candidate });
    } catch (err) {
      logger.error("ICE candidate error:", err);
    }
  });

  socket.on("reject_call", ({ to }) => {
    try {
      io.to(String(to)).emit("call_rejected");
    } catch (err) {
      logger.error("Reject call error:", err);
    }
  });

  socket.on("end_call", ({ to }) => {
    try {
      io.to(String(to)).emit("call_ended");
    } catch (err) {
      logger.error("End call error:", err);
    }
  });
};

module.exports = callHandler;
