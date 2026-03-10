const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

/**
 * daily_limits collection
 *
 * PURPOSE:
 *   Ek user ek din mein maximum 5 recommendations dekh sakta hai.
 *   Ye collection har user ke liye ek date-wise counter maintain karta hai.
 *
 * Fields:
 *   phone     : String  — User ka phone (10-digit)
 *   date      : String  — "YYYY-MM-DD" format (e.g. "2024-03-10")
 *   count     : Number  — Aaj kitne recommendations dekhe (0 se start)
 *
 * HOW IT WORKS:
 *   - Har baar getNextRecommendation call hota hai, count check hota hai.
 *   - count >= DAILY_LIMIT (5)? → "Aaj ka limit ho gaya" message return karo.
 *   - count < DAILY_LIMIT? → Recommendation do + count increment karo.
 *   - Naya din aaya? → naya document create ho jaata hai (upsert logic se).
 *   - Purane records auto-expire ho jaate hain TTL index se (7 days baad).
 */
const dailyLimitSchema = new mongoose.Schema(
  {
    phone:  { type: String, required: true, trim: true },
    date:   { type: String, required: true }, // "YYYY-MM-DD"
    count:  { type: Number, default: 0, min: 0 }
  },
  { timestamps: true, strict: false }
);

/**
 * INDEXES
 *
 * 1. Compound UNIQUE: { phone, date }
 *    Ek user ka ek din mein ek hi record hoga — upsert safe rehega.
 *
 * 2. TTL Index on createdAt:
 *    7 din baad purane limit records auto-delete ho jaayenge.
 *    MongoDB khud cleanup karta hai — manual kaam nahi.
 */
dailyLimitSchema.index(
  { phone: 1, date: 1 },
  { unique: true, name: "unique_phone_date" }
);
dailyLimitSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 604800, name: "ttl_7days_cleanup" } // 7 days = 604800 seconds
);

dailyLimitSchema.plugin(mongoosePaginate);

module.exports = dailyLimitSchema;
