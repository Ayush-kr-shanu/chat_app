const express = require("express");
const { authController } = require("../../controllers");
const { authValidation } = require("../../validation");
const validate = require("../../middleware/validate");
const router = express.Router();

router.post(
  "/register",
  validate(authValidation.register),
  authController.register,
);

router.post("/login", validate(authValidation.login), authController.login);

module.exports = router;
