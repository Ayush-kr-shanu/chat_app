const express = require("express");
const authRoute = require("./auth.route");
const userRoute = require("./user.route");
const conversationRoute = require("./conversation.route");
const messageRoute = require("./message.route");

const router = express.Router();

router.use("/auth", authRoute);
router.use("/users", userRoute);
router.use("/conversations", conversationRoute);
router.use("/messages", messageRoute);

module.exports = router;