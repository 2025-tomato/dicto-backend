const admin = require("../firebase");
const db = admin.firestore();
const { generateSessionComparisonSummary } = require("../utils/gptService");

exports.getTodayFeedback = async (req, res) => {
  const { device_uuid } = req.query;

  if (!device_uuid) {
    return res.status(400).json({
      success: false,
      message: "필수 파라미터 누락"
    });
  }

  try {
    // KST 기준 오늘 범위
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    // 오늘 생성된 세션 중 device_uuid가 일치하는 것만 조회
    const sessionSnap = await db.collection("practice_sessions")
      .where("created_at", ">=", admin.firestore.Timestamp.fromDate(start))
      .where("created_at", "<=", admin.firestore.Timestamp.fromDate(end))
      .where("device_uuid", "==", device_uuid)
      .get();

    if (sessionSnap.empty) {
      return res.status(404).json({
        success: false,
        message: "오늘 생성된 세션이 없습니다."
      });
    }

    const sessionIds = sessionSnap.docs.map(doc => doc.data().session_id);

    // 각 세션 ID에 대응하는 feedback 조회
    const feedbackPromises = sessionIds.map(id =>
      db.collection("feedback").where("session_id", "==", id).limit(1).get()
    );

    const feedbackSnaps = await Promise.all(feedbackPromises);

    const feedbackList = feedbackSnaps
      .filter(snap => !snap.empty)
      .map(snap => {
        const data = snap.docs[0].data();
        return {
          session_id: data.session_id,
          created_at: data.created_at?.toDate(),
          feedback: {
            raw_metrics: {
              script_match_rate: data.script_match_rate,
              eye_contact_rate: data.eye_contact_rate,
              speed_wpm: data.speed_wpm,
              filler_word_count: data.filler_word_count,
              pitch_std: data.pitch_std
            },
            scores: {
              script_score: data.match_score,
              eye_score: data.eye_score,
              speed_score: data.speed_score,
              filler_score: data.filler_score,
              pitch_score: data.pitch_score,
              total_score: data.total_score
            },
            summary: data.summary,
            improvement_tips: data.improvement_tips
          }
        };
      });

    if (feedbackList.length === 0) {
      return res.status(404).json({
        success: false,
        message: "해당 세션에 대한 피드백이 없습니다."
      });
    }

    return res.json({
      success: true,
      count: feedbackList.length,
      results: feedbackList
    });

  } catch (error) {
    console.error("오늘 피드백 조회 오류", error);
    return res.status(500).json({
      success: false,
      message: "서버 오류",
      error: error.message
    });
  }
};

exports.compareTwoFeedbacks = async (req, res) => {
  const { session_ids } = req.body;

  if (!Array.isArray(session_ids) || session_ids.length !== 2) {
    return res.status(400).json({
      success: false,
      message: "session_ids는 두 개여야 합니다."
    });
  }

  try {
    const snapshot = await db.collection("feedback")
      .where("session_id", "in", session_ids)
      .get();

    if (snapshot.size < 2) {
      return res.status(404).json({
        success: false,
        message: "하나 이상의 세션에 대한 피드백을 찾을 수 없습니다."
      });
    }

    const feedbacks = snapshot.docs.map(doc => doc.data());
    const [fb1, fb2] = session_ids.map(id => feedbacks.find(f => f.session_id === id));

    if (!fb1 || !fb2) {
      return res.status(404).json({
        success: false,
        message: "하나 이상의 세션에 대한 피드백을 찾을 수 없습니다."
      });
    }

    const sessionDocs = await Promise.all(
      session_ids.map(id =>
        db.collection("practice_sessions").where("session_id", "==", id).limit(1).get()
      )
    );

    const sessionData = sessionDocs.map(snap => snap.empty ? null : snap.docs[0].data());

    if (sessionData.includes(null)) {
      return res.status(404).json({
        success: false,
        message: "하나 이상의 세션 정보(practice_sessions)를 찾을 수 없습니다."
      });
    }

    const [s1, s2] = sessionData;

    if (s1.script_id !== s2.script_id) {
      return res.status(400).json({
        success: false,
        message: "두 피드백은 서로 다른 스크립트에서 생성되었습니다."
      });
    }

    const format = (feedback, session) => ({
      session_id: feedback.session_id,
      script_id: session.script_id,
      raw_metrics: {
        script_match_rate: feedback.script_match_rate,
        eye_contact_rate: feedback.eye_contact_rate,
        speed_wpm: feedback.speed_wpm,
        filler_word_count: feedback.filler_word_count,
        pitch_std: feedback.pitch_std
      },
      scores: {
        script_score: feedback.match_score,
        eye_score: feedback.eye_score,
        speed_score: feedback.speed_score,
        filler_score: feedback.filler_score,
        pitch_score: feedback.pitch_score,
        total_score: feedback.total_score
      }
    });

    // GPT 기반 비교 요약 문장 생성
    const { summary, suggestion } = await generateSessionComparisonSummary(fb1, fb2);

    return res.json({
      success: true,
      feedback: [format(fb1, s1), format(fb2, s2)],
      comparison_summary: summary,          
      comparison_suggestion: suggestion     
    });

  } catch (error) {
    console.error("비교 API 오류:", error);
    return res.status(500).json({
      success: false,
      message: "서버 오류",
      error: error.message
    });
  }
};

  