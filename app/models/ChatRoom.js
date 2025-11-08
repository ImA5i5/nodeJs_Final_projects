// app/models/ChatRoom.js
const mongoose = require("mongoose");

const chatRoomSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  freelancer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: false },
}, { timestamps: true });

module.exports = mongoose.model("ChatRoom", chatRoomSchema);
