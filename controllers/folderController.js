const admin = require("../firebase");
const db = admin.firestore();

//사용자별 폴더 조회
exports.getFolders = async (req, res) => {
  try {
    const { device_uuid } = req.query;

    if (!device_uuid) {
      return res.status(400).json({
        success: false,
        message: "필수 파라미터 누락"
      });
    }

    const foldersRef = db.collection("folders")
      .where("device_uuid", "==", device_uuid)
      .orderBy("created_at", "desc"); // 기본 최신순

    const snapshot = await foldersRef.get();

    const folders = snapshot.docs.map(doc => {
      const data = doc.data();

      return {
        folder_id: data.folder_id,
        script_id: data.script_id,
        title: data.title,
        created_at: data.created_at
      };
    });

    return res.status(200).json({
      success: true,
      folders
    });

  } catch (error) {
    console.error("폴더 목록 조회 오류:", error);
    return res.status(500).json({
      success: false,
      message: "서버 오류",
      error: error.message || error.toString()
    });
  }
};



//폴더 내 발표 연습 기록 리스트 조회
exports.getFolderSessions = async (req, res) => {
    try {
      const { folder_id } = req.params;
      const { sort } = req.query;
  
      if (!folder_id) {
        return res.status(400).json({
          success: false,
          message: "필수 파라미터 누락"
        });
      }
  
      const sortOrder = (sort && sort.toLowerCase() === "asc") ? "asc" : "desc";
  
      const sessionsRef = db.collection("practice_sessions")
        .where("folder_id", "==", folder_id)
        .orderBy("created_at", sortOrder);
  
      const snapshot = await sessionsRef.get();
  
      if (snapshot.empty) {
        return res.status(404).json({
          success: false,
          message: "발표 연습 기록을 찾을 수 없습니다."
        });
      }
  
      const sessions = await Promise.all(snapshot.docs.map(async doc => {
        const data = doc.data();
        const session_id = data.session_id;
  
        // 해당 세션에 연결된 피드백 문서 조회
        const feedbackSnapshot = await db.collection("feedback")
          .where("session_id", "==", session_id)
          .limit(1)
          .get();
  
        let feedback_title = null;
        if (!feedbackSnapshot.empty) {
          feedback_title = feedbackSnapshot.docs[0].data().title || null;
        }
  
        return {
          session_id,
          created_at: data.created_at,
          speed_wpm: data.speed_wpm,
          eye_contact_rate: data.eye_contact_rate,
          filler_word_count: data.filler_word_count,
          feedback_title
        };
      }));
  
      return res.status(200).json({
        success: true,
        sessions
      });
  
    } catch (error) {
      console.error("발표 연습 기록 조회 오류:", error);
      return res.status(500).json({
        success: false,
        message: "서버 오류",
        error: error.message || error.toString()
      });
    }
  };
  
  //폴더 이름 수정
  exports.updateFolderTitle = async (req, res) => {
    const { folder_id } = req.params;
    const { new_title, device_uuid } = req.body;
  
    if (!new_title || !device_uuid) {
      return res.status(400).json({ success: false, message: "new_title 또는 device_uuid 누락" });
    }
  
    const trimmedTitle = new_title.trim();
  
    const existing = await db.collection("folders")
      .where("device_uuid", "==", device_uuid)
      .where("title", "==", trimmedTitle)
      .get();
  
    const isDuplicate = existing.docs.some(doc => doc.id !== folder_id);
    if (isDuplicate) {
      return res.status(409).json({ success: false, message: "이미 동일한 폴더 이름이 존재합니다." });
    }
  
    await db.collection("folders").doc(folder_id).update({
      title: trimmedTitle
    });
  
    return res.json({ success: true, message: "폴더 이름이 수정되었습니다." });
  };
  
  


  //폴더 삭제
  exports.deleteFolderWithDependencies = async (req, res) => {
    try {
      const { folder_id } = req.params;
  
      if (!folder_id) {
        return res.status(400).json({
          success: false,
          message: "필수 데이터 누락"
        });
      }
  
      const folderDoc = db.collection("folders").doc(folder_id);
      const folderSnapshot = await folderDoc.get();
  
      if (!folderSnapshot.exists) {
        return res.status(404).json({
          success: false,
          message: "폴더를 찾을 수 없습니다."
        });
      }
  
      const script_id = folderSnapshot.data().script_id;
  
      // session 및 feedback 삭제
      const sessionSnapshot = await db.collection("practice_sessions")
        .where("folder_id", "==", folder_id)
        .get();
  
      const sessionDeletes = [];
      const feedbackDeletes = [];
  
      for (const doc of sessionSnapshot.docs) {
        const session_id = doc.data().session_id;
        sessionDeletes.push(doc.ref.delete());
  
        const feedbackSnap = await db.collection("feedback")
          .where("session_id", "==", session_id)
          .get();
  
        feedbackSnap.forEach(fb => feedbackDeletes.push(fb.ref.delete()));
      }
  
      // 실행
      await Promise.all([...sessionDeletes, ...feedbackDeletes]);
  
      // 스크립트 삭제
      if (script_id) {
        await db.collection("scripts").doc(script_id).delete();
      }
  
      // 폴더 삭제
      await folderDoc.delete();
  
      return res.status(200).json({
        success: true,
        message: "폴더 및 관련 데이터가 모두 삭제되었습니다."
      });
  
    } catch (error) {
      console.error("폴더 삭제 오류:", error);
      return res.status(500).json({
        success: false,
        message: "서버 오류",
        error: error.message || error.toString()
      });
    }
  };
  