const express = require("express");
const router = express.Router();
const folderController = require("../controllers/folderController");

// 폴더 목록 조회
router.get("/", folderController.getFolders);

// 폴더 내 발표 기록 조회
router.get("/:folder_id/sessions", folderController.getFolderSessions);

// 폴더 이름 수정
router.put("/:folder_id", folderController.updateFolderTitle);

// 폴더 삭제
router.delete("/:folder_id", folderController.deleteFolderWithDependencies);

module.exports = router;
