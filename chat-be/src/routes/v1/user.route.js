const express = require("express");
const { userController } = require("../../controllers");
const { userValidation } = require("../../validation");
const validate = require("../../middleware/validate");
const auth = require("../../middleware/auth");
const router = express.Router();

router.get(
  "/",
  auth,
  validate(userValidation.search),
  userController.searchUsers,
);

module.exports = router;
