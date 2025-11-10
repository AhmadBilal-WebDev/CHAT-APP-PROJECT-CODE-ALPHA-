const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const db = require("./confiq/db");
const router = require("./router/userRouter");

const app = express();
app.use(bodyParser.json());
app.use(cors());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/auth", router);
app.use("/chat", router);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

let users = {};

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.on("addUser", (userId) => {
    users[userId] = socket.id;
    io.emit("onlineUsers", Object.keys(users));
    console.log("User added:", userId, "->", socket.id);
  });

  socket.on("sendMsg", (data) => {
    const { senderId, receiverId } = data;
    const receiverSocketId = users[receiverId];
    const senderSocketId = users[senderId];

    if (receiverSocketId) io.to(receiverSocketId).emit("shareMsg", data);
    if (senderSocketId && senderSocketId !== socket.id)
      io.to(senderSocketId).emit("shareMsg", data);
  });

  socket.on("callUser", ({ fromUserId, toUserId, offer }) => {
    const toSocket = users[toUserId];
    if (!toSocket) {
      const fromSocket = users[fromUserId];
      if (fromSocket) {
        io.to(fromSocket).emit("callUnavailable", {
          toUserId,
          message: "User is not online",
        });
      }
      return;
    }
    io.to(toSocket).emit("incomingCall", {
      fromUserId,
      offer,
    });
  });

  socket.on("answerCall", ({ fromUserId, toUserId, answer }) => {
    const toSocket = users[toUserId];
    if (toSocket) {
      io.to(toSocket).emit("callAnswered", {
        fromUserId,
        answer,
      });
    }
  });

  socket.on("iceCandidate", ({ fromUserId, toUserId, candidate }) => {
    const toSocket = users[toUserId];
    if (toSocket) {
      io.to(toSocket).emit("iceCandidate", {
        fromUserId,
        candidate,
      });
    }
  });

  socket.on("endCall", ({ fromUserId, toUserId }) => {
    const toSocket = users[toUserId];
    if (toSocket) {
      io.to(toSocket).emit("callEnded", { fromUserId });
    }
  });

  socket.on("disconnect", () => {
    Object.keys(users).forEach((userId) => {
      if (users[userId] === socket.id) delete users[userId];
    });
    io.emit("onlineUsers", Object.keys(users));
    console.log("Disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
