/**
 * utilities/googleSheetLogger.js
 *
 * PURPOSE:
 *   Har important chatbot event (recommendation seen, connection request, accept/reject)
 *   ko Google Sheet mein log karta hai — analytics aur debugging ke liye.
 *
 * IMPORTANT:
 *   - Yeh utility NON-BLOCKING hai — agar Google Sheet fail ho
 *     toh main chatbot flow NAHI rukta. Silent fail hota hai.
 *   - Google Service Account JSON .env mein store karo.
 *
 * SETUP STEPS:
 *   1. Google Cloud Console → Service Account banao
 *   2. Google Sheets API enable karo
 *   3. Service Account key JSON download karo
 *   4. Apni Google Sheet mein service account email ko Editor access do
 *   5. .env.local mein GOOGLE_SHEET_ID aur GOOGLE_SERVICE_ACCOUNT_JSON set karo
 *
 * GOOGLE SHEET STRUCTURE (4 tabs):
 *   Tab 1: "SeenRecommendations" → ViewerPhone | SeenPhone | Category | Timestamp
 *   Tab 2: "ConnectionRequests"  → Sender | Receiver | Status | RequestId | Timestamp
 *   Tab 3: "DailyLimits"        → Phone | Date | Count | Timestamp
 *   Tab 4: "SystemEvents"        → EventType | Detail | Timestamp
 */

const { google } = require("googleapis");

// ─── Sheet Tab Names (Google Sheet mein same naam rakhna) ─────────────────
const SHEET_TABS = {
  SEEN_RECOMMENDATIONS: "SeenRecommendations",
  CONNECTION_REQUESTS:  "ConnectionRequests",
  DAILY_LIMITS:         "DailyLimits",
  SYSTEM_EVENTS:        "SystemEvents",
};

/**
 * Google Auth Client banata hai (Service Account se)
 * Har call pe naya client nahi banata — module-level cache use karta hai.
 */
let _authClient = null;

async function getAuthClient() {
  if (_authClient) return _authClient;

  const credentialsRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!credentialsRaw) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON env variable not set");
  }

  const credentials = typeof credentialsRaw === "string"
    ? JSON.parse(credentialsRaw)
    : credentialsRaw;

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  _authClient = await auth.getClient();
  return _authClient;
}

/**
 * Main logger function — Google Sheet mein ek row append karta hai.
 *
 * @param {string} sheetTab   - Sheet tab ka naam (SHEET_TABS constant se)
 * @param {Array}  rowData    - Array of values jo row mein jaane hain
 */
async function appendRow(sheetTab, rowData) {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) {
    console.warn("[GoogleSheet] ⚠️ GOOGLE_SHEET_ID not set — skipping log");
    return;
  }

  const authClient = await getAuthClient();
  const sheets = google.sheets({ version: "v4", auth: authClient });

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetTab}!A:Z`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    resource: {
      values: [rowData],
    },
  });
}

/**
 * logToGoogleSheet — Public function jo controller mein call hoga
 *
 * @param {string} eventType - Event ka naam (niche diye gaye types mein se)
 * @param {Object} data      - Event-specific data object
 *
 * Supported eventTypes:
 *   "SEEN_RECOMMENDATION"   — Recommendation dekhi gayi
 *   "CONNECTION_REQUEST"    — Request bheji gayi (pending)
 *   "REQUEST_ACCEPTED"      — Request accept hui
 *   "REQUEST_REJECTED"      — Request reject hui
 *   "DAILY_LIMIT_REACHED"   — User ka din ka limit khatam
 *   "ALL_RECOMMENDATIONS_DONE" — Saare profiles dekh liye
 */
async function logToGoogleSheet(eventType, data) {
  try {
    let sheetTab, row;
    const timestamp = data.timestamp || new Date().toISOString();

    switch (eventType) {

      // ── Recommendation dekhi gayi ──────────────────────────────────────
      case "SEEN_RECOMMENDATION":
        sheetTab = SHEET_TABS.SEEN_RECOMMENDATIONS;
        row = [
          data.viewerPhone      || "",
          data.seenProfilePhone || "",
          data.seenProfileId    || "",
          data.category         || "",
          timestamp,
        ];
        break;

      // ── Connection request bheji gayi (pending) ────────────────────────
      case "CONNECTION_REQUEST":
        sheetTab = SHEET_TABS.CONNECTION_REQUESTS;
        row = [
          data.senderPhone   || "",
          data.receiverPhone || "",
          "pending",
          data.requestId     || "",
          timestamp,
        ];
        break;

      // ── Request accept hui ─────────────────────────────────────────────
      case "REQUEST_ACCEPTED":
        sheetTab = SHEET_TABS.CONNECTION_REQUESTS;
        row = [
          data.senderPhone   || "",
          data.receiverPhone || "",
          "accepted",
          data.requestId     || "",
          timestamp,
        ];
        break;

      // ── Request reject/cancel hui ──────────────────────────────────────
      case "REQUEST_REJECTED":
        sheetTab = SHEET_TABS.CONNECTION_REQUESTS;
        row = [
          data.senderPhone   || "",
          data.receiverPhone || "",
          "rejected",
          data.requestId     || "",
          timestamp,
        ];
        break;

      // ── Daily limit khatam ─────────────────────────────────────────────
      case "DAILY_LIMIT_REACHED":
        sheetTab = SHEET_TABS.DAILY_LIMITS;
        row = [
          data.phone     || "",
          data.date      || "",
          data.count     || 5,
          timestamp,
        ];
        break;

      // ── Saare recommendations khatam ───────────────────────────────────
      case "ALL_RECOMMENDATIONS_DONE":
        sheetTab = SHEET_TABS.SYSTEM_EVENTS;
        row = [
          "ALL_RECOMMENDATIONS_DONE",
          `Phone: ${data.phone || ""} | Category: ${data.category || ""}`,
          timestamp,
        ];
        break;

      default:
        sheetTab = SHEET_TABS.SYSTEM_EVENTS;
        row = [
          eventType,
          JSON.stringify(data).slice(0, 200),
          timestamp,
        ];
    }

    await appendRow(sheetTab, row);
    console.log(`[GoogleSheet] ✅ Logged: ${eventType}`);

  } catch (err) {
    // ⚠️ IMPORTANT: Sheet fail hone par main flow NAHI rukega — sirf log karo
    console.error(`[GoogleSheet] ❌ Failed to log "${eventType}":`, err.message);
  }
}

module.exports = { logToGoogleSheet };
