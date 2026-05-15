const mongoose = require("mongoose");

const tokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    token: {
      type: String,
      required: true,
      unique: true, // prevent duplicates
    },

    type: {
      type: String,
      enum: ["refresh", "reset", "verify"],
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    device: {
      type: String, // e.g. "chrome", "iphone"
    },

    ip: {
      type: String,
    },
  },
  { timestamps: true }
);

tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Token = mongoose.model("Token", tokenSchema);

module.exports = Token;