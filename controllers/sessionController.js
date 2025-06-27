const admin = require("../firebase");
const db = admin.firestore();

// 세션 피드백 조회
exports.getSessionFeedback = async (req, res) => {
  const { session_id } = req.params;

  if (!session_id) {
    return res.status(400).json({ success: false, message: "세션 ID가 누락되었습니다." });
  }

  try {
    const feedbackSnapshot = await db.collection("feedback")
      .where("session_id", "==", session_id)
      .limit(1)
      .get();

    if (feedbackSnapshot.empty) {
      return res.status(404).json({ success: false, message: "해당 세션의 피드백을 찾을 수 없습니다." });
    }

    const feedback = feedbackSnapshot.docs[0].data();
    return res.status(200).json({ success: true, feedback });

  } catch (error) {
    console.error("피드백 조회 오류:", error);
    return res.status(500).json({ success: false, message: "서버 오류", error: error.message || error.toString() });
  }
};

// 세션 삭제
exports.deleteSession = async (req, res) => {
  const { session_id } = req.params;

  if (!session_id) {
    return res.status(400).json({
      success: false,
      message: "세션 ID가 누락되었습니다."
    });
  }

  try {
    // 세션 문서 확인
    const sessionRef = db.collection("practice_sessions").doc(session_id);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return res.status(404).json({ success: false, message: "해당 세션을 찾을 수 없습니다." });
    }

    // 1. 세션 삭제
    await sessionRef.delete();

    // 2. 연결된 피드백 삭제 (session_id 기반)
    const feedbackSnapshot = await db.collection("feedback")
      .where("session_id", "==", session_id)
      .get();

    const batch = db.batch();
    feedbackSnapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    return res.status(200).json({
      success: true,
      message: "세션 및 피드백이 삭제되었습니다."
    });


  } catch (error) {
    console.error("세션 삭제 오류:", error);
    return res.status(500).json({ success: false, message: "서버 오류", error: error.message || error.toString() });
  }
  
};

//세션 이름 수정
exports.updateSessionTitle = async (req,res) =>{
  const { session_id } = req.params;
  const { new_title } = req.body;

  if(!session_id || !new_title){
    return res.status(400).json({success:false, message:"session_id 또는 new_title이 누락되었습니다."})
  }

  try{
    const feedbackSnapshot = await db.collection("feedback")
    .where("session_id","==",session_id)
    .limit(1)
    .get();

    if(!feedbackSnapshot.empty){
      const feedbackDoc =feedbackSnapshot.docs[0];
      await feedbackDoc.ref.update({ title: new_title });
    }

    return res.json({ success: true, message: "이름이 변경되었습니다." });

  }catch (error) {
    console.error("제목 변경 오류:", error);
    return res.status(500).json({ success: false, message: "서버 오류", error: error.message });
  }
}


