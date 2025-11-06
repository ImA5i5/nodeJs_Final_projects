// app/config/db.js
const mongoose = require("mongoose");
const winston = require("./winston");

const db = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    winston.info(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    winston.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = db;
