const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

/**
 * connection_requests collection schema
 *
 * Fields (strict: false — extra fields allowed):
 *  senderPhone    : String  — User A ka WhatsApp number (with country code, no +)
 *  receiverPhone  : String  — User B ka WhatsApp number
 *  status         : String  — "pending" | "accepted" | "rejected"
 *  createdAt      : Date    — auto (timestamps: true)
 *  updatedAt      : Date    — auto (timestamps: true)
 */
const schema = new mongoose.Schema(
  {
    senderPhone:   { type: String, required: true, trim: true },
    receiverPhone: { type: String, required: true, trim: true },
    status:        { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" }
  },
  { timestamps: true, strict: false }
);

schema.plugin(mongoosePaginate);
module.exports = schema;
