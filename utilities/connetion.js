const mongoose = require("mongoose")

const options = {
  serverSelectionTimeoutMS: 30000, // 30s timeout
  socketTimeoutMS: 45000,
  family: 4,                      // Force IPv4 (important for Vercel/Atlas stability)
  heartbeatFrequencyMS: 10000,    // Check connection every 10s
};

if (!process.env.MONGODB_URL) {
  console.error("FATAL ERROR: MONGODB_URL environment variable is not defined!");
}

console.log("[MongoDB] Initializing connection...");

const mongoDB = mongoose.createConnection(process.env.MONGODB_URL, options);

mongoDB.on('connecting', () => {
    console.log('[MongoDB] Connecting...');
});

mongoDB.on('connected', () => {
    console.log('[MongoDB] ✅ Successfully connected to MongoDB');
});

mongoDB.on('error', (err) => {
    console.error('[MongoDB] ❌ Error through createConnection:', err);
});

mongoDB.on('disconnected', () => {
    console.log('[MongoDB] ⚠️ Disconnected from MongoDB');
});

mongoDB.on('reconnected', () => {
    console.log('[MongoDB] ♻️ Reconnected to MongoDB');
});

module.exports = mongoDB;
