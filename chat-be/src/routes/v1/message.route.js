const express = require("express");
const { conversationController } = require("../../controllers");
const auth = require("../../middleware/auth");

const router = express.Router();

router.get("/:conversationId", auth, conversationController.getMessages);

router.post("/", auth, conversationController.sendMessage);

module.exports = router;
