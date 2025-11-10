// router/userRouter.js
const express = require("express");
const {
  signUp,
  logIn,
  getAllUsers,
  sendMessage,
  showMessage,
  uploadFile,
} = require("../controller/userControllers");
const {
  signUpValidation,
  logInValidation,
} = require("../validation/userValidation");
const router = express.Router();

// multer setup for file uploads (disk storage)
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ensure uploads folder exists
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // unique filename: timestamp-originalname
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// file filter (allow images, videos, docs, pdf, etc.)
const fileFilter = (req, file, cb) => {
  // you can restrict types if you want
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 1024 * 1024 * 50 }, // 50 MB limit
});

// auth routes
router.post("/signup", signUpValidation, signUp);
router.post("/login", logInValidation, logIn);
router.get("/getAllUsers", getAllUsers);

// message routes
router.post("/message", sendMessage);
router.get("/showAllMessages/:senderId/:receiverId", showMessage);

// upload route (multipart/form-data)
router.post("/upload", upload.single("file"), uploadFile);

module.exports = router;
