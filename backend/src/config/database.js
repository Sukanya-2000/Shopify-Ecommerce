const mongoose = require("mongoose");
const { dataStore, mongoUri } = require("./env");

async function connectDatabase() {
  if (dataStore === "json") {
    console.log("Using local JSON data store");
    return;
  }

  mongoose.set("strictQuery", true);

  try {
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

module.exports = connectDatabase;
