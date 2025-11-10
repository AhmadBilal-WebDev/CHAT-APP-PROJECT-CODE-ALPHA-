const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true,
    default: "",
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
    default: "",
  },
});

const User = mongoose.model("User", schema);
module.exports = User;
