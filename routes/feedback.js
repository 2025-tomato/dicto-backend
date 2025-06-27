const express = require("express");
const router = express.Router();
const feedbackController = require("../controllers/feedbackController");

router.get("/today", feedbackController.getTodayFeedback);
router.post("/compare", feedbackController.compareTwoFeedbacks);


module.exports = router;
