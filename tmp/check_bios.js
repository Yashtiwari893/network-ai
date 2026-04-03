
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: 'd:/VectorSearch - Copy/.env.local' });

const constants = require('d:/VectorSearch - Copy/utilities/constants');
const userModel = require('d:/VectorSearch - Copy/models/user.model.js');

async function checkSpecificUsers() {
  try {
    const mongoUri = process.env.MONGODB_URL;
    if (!mongoUri) throw new Error('MONGODB_URL not found');
    await mongoose.connect(mongoUri, { dbName: constants.DEFAULT_DB });
    const User = mongoose.model(constants.MODELS.user, userModel);
    const users = await User.find({ name: { $in: ['Yash Tiwari', 'Denish ubhal'] } }).lean();
    users.forEach(u => {
      console.log(`Name: ${u.name}, Bio: ${u.bio}, Phone: ${u.phone}, Category: ${JSON.stringify(u.category)}`);
    });
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}
checkSpecificUsers();
