const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const analyzeController = require("../controllers/analyzeController");

router.post("/", upload.single("audio"), analyzeController.analyzeSpeech);

module.exports = router;

