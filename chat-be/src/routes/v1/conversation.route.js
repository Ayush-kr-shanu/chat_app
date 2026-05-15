const express = require("express");
const { conversationController } = require("../../controllers");
const auth = require("../../middleware/auth");

const router = express.Router();

router.get("/", auth, conversationController.getConversations);
router.post("/", auth, conversationController.createConversation);
router.post("/seen", auth, conversationController.markAsSeen);

module.exports = router;
