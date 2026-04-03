
const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');
dotenv.config({ path: 'd:/VectorSearch - Copy/.env.local' });

async function testEmbedding() {
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
    const response = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: "IT professional",
    });
    console.log("Model: gemini-embedding-001");
    console.log("Vector length:", response.embeddings[0].values.length);
    
    // Try text-embedding-004 just in case
    try {
      const response4 = await ai.models.embedContent({
        model: "text-embedding-004",
        contents: "IT professional",
      });
      console.log("Model: text-embedding-004");
      console.log("Vector length:", response4.embeddings[0].values.length);
    } catch (e) {
      console.log("text-embedding-004 failed");
    }
  } catch (err) {
    console.error(err.message);
  }
}
testEmbedding();
