const mongoose = require("mongoose");
require("dotenv").config();

const URL = process.env.MONGO_DB;

mongoose.connect(URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on("connected", () => console.log("MongoDB connect successfully!"));
db.on("disconnected", () => console.log("MongoDB disconnect successfully!"));
db.on("error", () => console.log("Connection error"));

module.exports = db;
