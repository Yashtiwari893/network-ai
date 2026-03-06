const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

/**
 * connection_requests collection schema
 *
 * Fields:
 *  senderPhone       : String  — User A ka WhatsApp number (10-digit, mobileNo_wo_code)
 *  receiverPhone     : String  — User B ka WhatsApp number (10-digit)
 *  status            : String  — "pending" | "accepted" | "rejected"
 *  templateMessageId : String  — 11za ka messageId (ivy_connection_request send ke baad)
 *  acceptedAt        : Date    — jab User B ne accept kiya (webhook se set hoga)
 *  createdAt         : Date    — auto (timestamps: true)
 *  updatedAt         : Date    — auto (timestamps: true)
 */
const schema = new mongoose.Schema(
  {
    senderPhone:       { type: String, required: true, trim: true },
    receiverPhone:     { type: String, required: true, trim: true },
    status:            { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
    templateMessageId: { type: String, default: null },  // 11za messageId for tracking
    acceptedAt:        { type: Date,   default: null }    // timestamp of acceptance
  },
  { timestamps: true, strict: false }
);

schema.plugin(mongoosePaginate);
module.exports = schema;
