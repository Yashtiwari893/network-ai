const mongoose = require("mongoose")
const options = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

const mongoDB = mongoose.createConnection(process.env.MONGODB_URL, options);

mongoDB.on('connected', () => console.log('MongoDB connected through createConnection'));
mongoDB.on('error', (err) => console.error('MongoDB error through createConnection:', err));
mongoDB.on('disconnected', () => console.log('MongoDB disconnected through createConnection'));


module.exports = mongoDB;
