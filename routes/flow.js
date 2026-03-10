const express = require("express");
const router = express.Router();
const flowController = require("../controller/flowController");

// ─── User Management ─────────────────────────────────────────────────────────
router.post("/checkUserProfile",  flowController.checkUserProfile);
router.post("/addUser",           flowController.addUser);
router.post("/addUserVector",     flowController.addUservector);
router.post("/updateUser/:mobile",flowController.updateUser);
router.post("/getCategoryByUser", flowController.getCategoryByUser);

// ─── Search ──────────────────────────────────────────────────────────────────
router.post("/searchCompany",    flowController.searchUser);
router.post("/searchByCategory", flowController.searchUserByCategoryAndBio);
router.post("/chatbotSearch",    flowController.chatbotSearch);

// ─── Recommendation Engine (NEW) ─────────────────────────────────────────────
router.post("/getNextRecommendation", flowController.getNextRecommendation); // NEW core API
router.post("/checkDailyLimit",       flowController.checkDailyLimit);       // NEW daily 5 limit
router.post("/getSeenCount",          flowController.getSeenCount);          // NEW debug/analytics

// ─── Old Recommendation (legacy) ─────────────────────────────────────────────
router.post("/getRecommendations", flowController.getRecommendations);

// ─── Connection Request Flow ──────────────────────────────────────────────────
router.post("/sendConnectionRequest",    flowController.sendConnectionRequest);
router.post("/acceptConnectionRequest",  flowController.acceptConnectionRequest);
router.post("/getConnectionStatus",      flowController.getConnectionStatus);

// ─── 11za Webhook — Template Button Reply (ACCEPT_ / CANCEL_ postback) ───────
router.post("/webhook/templateReply", flowController.templateWebhook);

// ─── Diagnostics ─────────────────────────────────────────────────────────────
router.get("/db-status", flowController.getDbStatus);

module.exports = router;
