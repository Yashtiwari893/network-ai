require('dotenv').config({ path: ['.env', '.env.local'] });
console.log("URL:", process.env.MONGODB_URL);
