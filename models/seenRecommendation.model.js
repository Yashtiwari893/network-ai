const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

/**
 * seen_recommendations collection
 *
 * PURPOSE:
 *   Track karta hai ki kaunse user ne kaunse profile dekha.
 *   Isse dobara wohi profile nahi dikhegi.
 *
 * Fields:
 *   viewerPhone     : String  — Jo user dekh raha hai uska phone (10-digit)
 *   seenProfileId   : ObjectId — Jo profile dekhi uska MongoDB _id (users collection)
 *   seenProfilePhone: String  — Quick reference ke liye (avoid extra lookup)
 *   category        : String  — Kis category mein dekha gaya ("Startup"|"Investor"|"Others")
 *   seenAt          : Date    — Kab dekha (daily limit check ke liye bhi use hoga)
 */
const seenRecommendationSchema = new mongoose.Schema(
  {
    viewerPhone:      { type: String, required: true, trim: true },
    seenProfileId:    { type: mongoose.Schema.Types.ObjectId, required: true, ref: "users" },
    seenProfilePhone: { type: String, trim: true, default: null },
    category:         { type: String, trim: true, default: null },
    seenAt:           { type: Date, default: Date.now }
  },
  { timestamps: true, strict: false }
);

/**
 * INDEXES — Performance aur correctness ke liye critical
 *
 * 1. Compound UNIQUE index:
 *    Ek viewer ek profile ko sirf ek baar seen_recommendations mein store kar sakta hai.
 *    upsert ke saath milake use karo — idempotent ho jaata hai.
 *
 * 2. viewerPhone + category:
 *    Category-wise seen profiles fetch karne ke liye (category filter mein).
 *
 * 3. viewerPhone + seenAt:
 *    Daily limit check ke liye — aaj kitni baar dekha.
 */
seenRecommendationSchema.index(
  { viewerPhone: 1, seenProfileId: 1 },
  { unique: true, name: "unique_viewer_profile" }
);
seenRecommendationSchema.index(
  { viewerPhone: 1, category: 1 },
  { name: "viewer_category_lookup" }
);
seenRecommendationSchema.index(
  { viewerPhone: 1, seenAt: 1 },
  { name: "viewer_daily_check" }
);

seenRecommendationSchema.plugin(mongoosePaginate);

module.exports = seenRecommendationSchema;
