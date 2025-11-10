// controllers/userControllers.js
const Message = require("../model/messageModel");
const userModel = require("../model/userModel");
const bcrypt = require("bcrypt");
const path = require("path");
const fs = require("fs");
const SERVER_URL = process.env.SERVER_URL || "http://localhost:5000";

// ---------- auth controllers (your existing functions) ----------
const signUp = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const name = await userModel.findOne({ username });
    if (name) {
      return res.status(401).json({
        success: false,
        field: "username",
        message: "Username already exist!",
      });
    }
    const userEmail = await userModel.findOne({ email });
    if (userEmail) {
      return res.status(401).json({
        success: false,
        field: "email",
        message: "User email already exist!",
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUserModel = new userModel({
      username,
      email,
      password: hashedPassword,
    });
    const responce = await newUserModel.save();
    res.status(200).json({
      success: true,
      message: "signup successfully!",
      data: responce,
    });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
};

const logIn = async (req, res) => {
  try {
    const { username, password } = req.body;
    const name = await userModel.findOne({ username });
    if (!name) {
      return res.status(401).json({
        success: false,
        field: "username",
        message: "Username not exist!",
      });
    }
    const comparePassword = await bcrypt.compare(password, name.password);
    if (!comparePassword) {
      return res.status(404).json({
        success: false,
        field: "password",
        message: "Invalid password!",
      });
    }
    const userData = {
      username: name.username,
      email: name.email,
      password: name.password,
      userId: name._id,
      isAvaterImageSet: name.isAvaterImageSet,
      avatarImage: name.avatarImage,
    };
    res.status(200).json({
      success: true,
      message: "User logged successfully!",
      data: userData,
    });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await userModel.find({});
    res.status(200).json({
      success: true,
      message: "Users fetched successfully!",
      data: users,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------- message controllers ----------

const sendMessage = async (req, res) => {
  try {
    const { message, senderId, receiverId, fileUrl, fileType, fileName } =
      req.body;

    const userMessage = new Message({
      message,
      senderId,
      receiverId,
      fileUrl,
      fileType,
      fileName,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });

    const response = await userMessage.save();

    res.status(200).json({
      success: true,
      message: "Message sent!",
      data: response,
    });
  } catch (error) {
    return res.status(401).json({ success: false, message: error.message });
  }
};

// ---------- message controllers ----------
const showMessage = async (req, res) => {
  try {
    const { senderId, receiverId } = req.params;
    const msg = await Message.find({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    })
      .sort({ createdAt: 1 })
      .lean();

    // prepend SERVER_URL to fileUrl if exists
    const updatedMsg = msg.map((m) => {
      if (m.fileUrl && m.fileUrl.startsWith("/uploads")) {
        return { ...m, fileUrl: SERVER_URL + m.fileUrl };
      }
      return m;
    });

    res.status(200).json({ success: true, data: updatedMsg });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const uploadFile = async (req, res) => {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });

    const { senderId, receiverId } = req.body;
    if (!senderId || !receiverId) {
      fs.unlinkSync(req.file.path);
      return res
        .status(400)
        .json({ success: false, message: "Missing senderId or receiverId" });
    }

    const mimetype = req.file.mimetype;
    let fileType = "other";
    if (mimetype.startsWith("image/")) fileType = "image";
    else if (mimetype.startsWith("video/")) fileType = "video";
    else if (mimetype.startsWith("audio/")) fileType = "audio";
    else fileType = "document";

    const fileUrl = `/uploads/${req.file.filename}`;

    const userMessage = new Message({
      message: "",
      senderId,
      receiverId,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      fileUrl,
      fileType,
      fileName: req.file.originalname,
    });

    const response = await userMessage.save();
    response.fileUrl = SERVER_URL + response.fileUrl;

    res.status(200).json({
      success: true,
      message: "File uploaded and message saved!",
      data: response,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  signUp,
  logIn,
  getAllUsers,
  sendMessage,
  showMessage,
  uploadFile,
};
