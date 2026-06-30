const express = require("express");
const router = express.Router();
const {
    sendMessage,
    getChatHistory,
    deleteAllChats,
    getChatSessions
} = require("../controllers/chatController");
const { protect } = require("../middleware/authMiddleware");

router.post("/message", protect, sendMessage);
router.get("/history", protect, getChatHistory);
router.delete("/history", protect, deleteAllChats);
router.get("/sessions", protect, getChatSessions);

module.exports = router;