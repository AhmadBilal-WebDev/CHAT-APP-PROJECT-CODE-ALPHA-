const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  message: { type: String },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  fileUrl: { type: String, default: null }, 
  fileType: { type: String, default: null },  
  fileName: { type: String, default: null }, 

  time: {
    type: String,
    required: true,
  },
}, { timestamps: true });

const Message = mongoose.model("Message", schema);
module.exports = Message;
