const mongoose = require("mongoose");

const options = {
  // Serverless optimization: Do not wait for server selection indefinitely
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  // Ensure we don't hold the event loop open on disconnection
  connectTimeoutMS: 10000,
};

// Global Connection Cache for Serverless (Vercel/Render)
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!process.env.MONGODB_URL) {
    throw new Error("MONGODB_URL is missing in Environment Variables!");
  }

  if (!cached.promise) {
    cached.promise = mongoose.createConnection(process.env.MONGODB_URL, options).asPromise();
  }

  try {
    cached.conn = await cached.promise;
    console.log("MongoDB connected successfully!");
  } catch (e) {
    cached.promise = null;
    console.error("MongoDB connection failed:", e.message);
    throw e;
  }

  return cached.conn;
}

// Keeping the original export pattern for compatibility but adding the promise ensure
const mongoDB = mongoose.createConnection(process.env.MONGODB_URL, options);

// Listen for connection events for logging
mongoDB.on('connected', () => console.log('MongoDB connected through createConnection'));
mongoDB.on('error', (err) => {
    console.error('MongoDB error through createConnection:', err.message);
    if (err.name === 'MongoServerSelectionError') {
      console.error('Check your IP Whitelist (0.0.0.0/0) or Credentials!');
    }
});
mongoDB.on('disconnected', () => console.log('MongoDB disconnected through createConnection'));

// Disable buffering so we get direct errors instead of hanging for 10s
mongoose.set('bufferCommands', false);

module.exports = mongoDB;
