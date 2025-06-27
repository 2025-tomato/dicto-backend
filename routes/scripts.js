const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const scriptController = require("../controllers/scriptController");


// multer 설정
const uploadPath = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath);
}

const upload = multer({ dest: uploadPath });

router.post("/", upload.single("script"),scriptController.uploadScript);

router.delete("/:script_id", scriptController.deleteScript);

module.exports = router;
