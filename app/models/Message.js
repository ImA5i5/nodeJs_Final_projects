// app/models/Message.js
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  room: { type: mongoose.Schema.Types.ObjectId, ref: "ChatRoom", required: true },

  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: false },


  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  content: { type: String },
  file: { type: String },

  messageType: {
    type: String,
    enum: ["text", "file", "system", "delivery", "revision"],
    default: "text",
  },

  status: {
    type: String,
    enum: ["sent", "delivered", "read"],
    default: "sent",
  },

}, { timestamps: true });

module.exports = mongoose.model("Message", messageSchema);
