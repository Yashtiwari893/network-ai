const express = require("express");
const router = express.Router();
const flowController = require("../controller/flowController");

router.post("/checkUserProfile", flowController.checkUserProfile);
router.post("/addUser", flowController.addUser);
router.post("/addUserVector", flowController.addUservector);
router.post("/searchCompany", flowController.searchUser);
router.post("/updateUser/:mobile", flowController.updateUser);
router.post("/searchByCategory", flowController.searchUserByCategoryAndBio);
router.post("/getCategoryByUser", flowController.getCategoryByUser);
router.post("/getRecommendations", flowController.getRecommendations)
router.post("/chatbotSearch", flowController.chatbotSearch)

// Connection Request Flow
router.post("/sendConnectionRequest",  flowController.sendConnectionRequest)
router.post("/acceptConnectionRequest", flowController.acceptConnectionRequest)
router.post("/getConnectionStatus",    flowController.getConnectionStatus)

module.exports = router