const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const url = process.env.MONGODB_URL;
console.log("Connecting to:", url);

mongoose.connect(url, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    console.log("Connected successfully!");
    process.exit(0);
  })
  .catch(err => {
    console.error("Connection failed:", err);
    process.exit(1);
  });
