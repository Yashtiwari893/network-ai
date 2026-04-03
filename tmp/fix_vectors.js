
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { GoogleGenAI } = require('@google/genai');

dotenv.config({ path: 'd:/VectorSearch - Copy/.env.local' });

const constants = require('d:/VectorSearch - Copy/utilities/constants');
const userModel = require('d:/VectorSearch - Copy/models/user.model.js');

async function getEmbedding(text) {
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
    // In this environment, gemini-embedding-001 returns 3072 dims
    const response = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: text,
    });
    if (!response.embeddings || response.embeddings.length === 0) return null;
    return response.embeddings[0].values;
  } catch (error) {
    console.error("Error generating embedding:", error.message);
    return null;
  }
}

async function fixEmptyVectors() {
  try {
    const mongoUri = process.env.MONGODB_URL;
    await mongoose.connect(mongoUri, { dbName: constants.DEFAULT_DB });
    const User = mongoose.model(constants.MODELS.user, userModel);

    // Find users with empty bio_vector or missing ones
    const users = await User.find({
      $or: [
        { bio_vector: { $exists: false } },
        { bio_vector: null },
        { bio_vector: { $size: 0 } }
      ]
    });

    console.log(`Found ${users.length} users with empty bio_vector.`);

    for (const user of users) {
      if (user.bio && user.bio.trim()) {
        process.stdout.write(`Embedding for ${user.name}... `);
        const vector = await getEmbedding(user.bio);
        if (vector) {
          await User.updateOne({ _id: user._id }, { $set: { bio_vector: vector } });
          console.log(`✅ ${vector.length} dims`);
        } else {
          console.log(`❌ Failed`);
        }
      } else {
        console.log(`Skipping ${user.name} (Empty bio)`);
      }
    }

    await mongoose.disconnect();
    console.log('Done!');
  } catch (err) {
    console.error(err);
  }
}

fixEmptyVectors();
