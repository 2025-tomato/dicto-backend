const express = require("express");
const router = express.Router();
const sessionController = require("../controllers/sessionController");

router.get('/:session_id', sessionController.getSessionFeedback);
router.delete("/:session_id", sessionController.deleteSession);
router.put("/:session_id/title",sessionController.updateSessionTitle);

module.exports = router;
