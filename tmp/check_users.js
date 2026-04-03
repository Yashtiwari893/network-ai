
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: 'd:/VectorSearch - Copy/.env.local' });

const constants = require('d:/VectorSearch - Copy/utilities/constants');
const userModel = require('d:/VectorSearch - Copy/models/user.model.js');

async function checkUsers() {
  try {
    const mongoUri = process.env.MONGODB_URL;
    if (!mongoUri) {
      throw new Error('MONGODB_URL not found in .env.local');
    }
    const conn = await mongoose.connect(mongoUri, {
      dbName: constants.DEFAULT_DB
    });
    console.log('Connected to DB');

    const User = mongoose.model(constants.MODELS.user, userModel);
    const users = await User.find({}, 'name phone bio_vector').lean();

    console.log('Total users:', users.length);
    users.forEach(u => {
      console.log(`Name: ${u.name}, Phone: ${u.phone}, Vector exists: ${!!u.bio_vector}, Vector length: ${u.bio_vector ? u.bio_vector.length : 0}`);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkUsers();
