const fs = require("fs");
const path = require("path");
const { exec, spawn } = require("child_process");
const admin = require("../firebase");
const db = admin.firestore();
const { calculateDetailedScores } = require("../utils/scoreCalculator");
const { generateImprovementSummary } = require("../utils/gptService");

async function getOrCreateFolder(device_uuid, script_id, title) {
  // 1. 동일한 device_uuid + script_id 조합이 있는지 확인
  const folderRef = db.collection("folders")
    .where("device_uuid", "==", device_uuid)
    .where("script_id", "==", script_id)
    .limit(1);

  const snapshot = await folderRef.get();
  if (!snapshot.empty) {
    return snapshot.docs[0].id;
  }

  // 2. 동일한 device_uuid 내에서 title 중복 확인 + 자동 숫자 붙이기
  const baseTitle = title.trim();
  let finalTitle = baseTitle;
  let index = 1;

  const allFolderSnapshot = await db.collection("folders")
    .where("device_uuid", "==", device_uuid)
    .get();

  const existingTitles = allFolderSnapshot.docs.map(doc => doc.data().title);

  while (existingTitles.includes(finalTitle)) {
    index += 1;
    finalTitle = `${baseTitle}_${index}`;
  }

  // 3. 폴더 생성
  const newFolderId = `folder-${Date.now()}`;
  await db.collection("folders").doc(newFolderId).set({
    folder_id: newFolderId,
    device_uuid,
    script_id,
    title: finalTitle,
    created_at: admin.firestore.FieldValue.serverTimestamp()
  });

  return newFolderId;
}



function calculateMatchRate(scriptText, userText) {
  const normalize = text => text.replace(/[\W_]+/g, " ").toLowerCase().trim();
  const scriptWords = normalize(scriptText).split(/\s+/);
  const userWords = normalize(userText).split(/\s+/);
  const scriptSet = new Set(scriptWords);
  const userSet = new Set(userWords);
  const matches = [...scriptSet].filter(word => userSet.has(word));
  return Math.round((matches.length / scriptSet.size) * 100);
}


function generateTips(scores) {
  const { match_score, eye_score, speed_score, filler_score, pitch_score } = scores;
  const tips = [];
  if (match_score < 20) tips.push("스크립트 일치율이 낮습니다. 스크립트 내용을 충분히 숙지하고 연습해보세요.");
  if (eye_score < 15) tips.push("청중(카메라)을 더 자주 바라보는 연습이 필요합니다.");
  if (speed_score < 10) tips.push("발표 속도를 조금 조절하여 너무 빠르거나 느리지 않게 해보세요.");
  if (filler_score < 10) tips.push("발표 중 불필요한 말버릇(음, 어..)을 줄이면 더욱 자연스럽게 들립니다.");
  if (pitch_score < 10) tips.push("목소리 높낮이를 조절하여 듣기 편한 발표를 만들어보세요.");
  if (tips.length === 0) tips.push("발표 전반이 매우 안정적입니다! 훌륭하게 진행하셨습니다.");
  return tips;
}

// async function tryWhisperAndParse(wavPath) {
//   return new Promise((resolve, reject) => {
//     exec(`python3 transcribe.py "${path.resolve(wavPath)}"`, (err, stdout, stderr) => {
//       if (err || stderr) {
//         return reject(new Error(`Whisper error: ${err || stderr}`));
//       }
//       try {
//         const parsed = JSON.parse(stdout);
//         resolve(parsed);
//       } catch (parseErr) {
//         reject(new Error(`JSON parse error: ${parseErr.message}`));
//       }
//     });
//   });
// }

async function tryWhisperAndParse(wavPath) {
  return new Promise((resolve, reject) => {
    exec(`python3 transcribe.py "${path.resolve(wavPath)}"`, (err, stdout, stderr) => {
      // stderr는 로그이므로 무시하고 err만 실패 조건으로 확인
      if (err) {
        console.error("[Whisper Error] Python process failed:", err.message);
        return reject(new Error(`Whisper execution failed: ${err.message}`));
      }

      if (stderr) {
        console.warn("[Whisper Warning] Python stderr output:\n", stderr);
        // 경고 출력은 로깅만, 실패로 간주하지 않음
      }

      try {
        const parsed = JSON.parse(stdout);
        resolve(parsed);
      } catch (parseErr) {
        console.error("❌ JSON 파싱 실패:", stdout);
        return reject(new Error(`JSON parse error: ${parseErr.message}`));
      }
    });
  });
}


exports.analyzeSpeech = async (req, res) => {
  console.log("📎 multer 업로드 결과:", req.file);
  const pcmPath = req.file?.path;

  if (!pcmPath || !fs.existsSync(pcmPath)) {
    console.error("❌ PCM 파일이 존재하지 않거나 경로가 잘못됨:", pcmPath);
    return res.status(400).send("PCM 파일이 존재하지 않습니다.");
  }

  const wavPath = `${pcmPath}-converted.wav`;
  const ffmpeg = spawn("ffmpeg", [
    "-y", "-f", "s16le", "-ar", "16000", "-ac", "1",
    "-i", pcmPath,
    "-af", "volume=5dB",
    wavPath
  ]);

  let ffmpegError = "";
  ffmpeg.stderr.on("data", data => {
    ffmpegError += data.toString();
  });

  ffmpeg.on("close", async (code) => {
    if (code !== 0 || !fs.existsSync(wavPath)) {
      console.error("❌ FFmpeg 변환 실패:", ffmpegError);
      fs.unlinkSync(pcmPath);
      return res.status(500).send("WAV 파일 생성 실패");
    }

    try {
      const whisperResult = await tryWhisperAndParse(wavPath);
      const { transcription, speed_wpm, filler_word_count, pitch_std, speech_duration } = whisperResult;
      const { device_uuid, script_id, eye_contact_rate } = req.body;

      const scriptDoc = await db.collection("scripts").doc(script_id).get();
      if (!scriptDoc.exists) return res.status(404).send("해당 스크립트를 찾을 수 없습니다.");

      const scriptText = scriptDoc.data().content;
      const scriptTitle = scriptDoc.data().title || "스크립트";
      const match_rate = calculateMatchRate(scriptText, transcription);

      const sessionId = `sess-${Date.now()}`;
      const feedbackId = `feed-${Date.now()}`;
      const created_at = admin.firestore.FieldValue.serverTimestamp();
      const folder_id = await getOrCreateFolder(device_uuid, script_id, scriptTitle);

      const feedbackSnapshot = await db.collection("feedback")
        .where("folder_id", "==", folder_id).get();

      const scriptTitleClean = scriptTitle.trim();
      const regex = new RegExp(`^${scriptTitleClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_([0-9]+)$`);
      let nextIndex = 1;

      feedbackSnapshot.forEach(doc => {
        const match = doc.data().title?.match(regex);
        if (match) {
          const num = parseInt(match[1]);
          if (num >= nextIndex) nextIndex = num + 1;
        }
      });

      const feedbackTitle = `${scriptTitleClean}_${nextIndex}`;

      const scores = calculateDetailedScores(
        Number(match_rate),
        Number(eye_contact_rate),
        Number(speed_wpm),
        Number(filler_word_count),
        Number(pitch_std)
      );

      const tipsArray = generateTips(scores);
      const { summary, improvement_tips } = await generateImprovementSummary({
        totalScore: scores.total_score,
        scores: {
          match_score: scores.match_score,
          eye_score: scores.eye_score,
          speed_score: scores.speed_score,
          filler_score: scores.filler_score,
          pitch_score: scores.pitch_score
        },
        tips: tipsArray
      });

      // DB 저장
      await db.collection("practice_sessions").doc(sessionId).set({
        session_id: sessionId,
        device_uuid,
        script_id,
        folder_id,
        transcription,
        pitch_data: { std: Number(pitch_std) },
        eye_contact_rate: Number(eye_contact_rate),
        filler_word_count: Number(filler_word_count),
        speed_wpm: Number(speed_wpm),
        speech_duration: Number(speech_duration),
        created_at
      });

      await db.collection("feedback").doc(feedbackId).set({
        feedback_id: feedbackId,
        session_id: sessionId,
        folder_id,
        title: feedbackTitle,
        summary,
        improvement_tips: [improvement_tips],
        script_match_rate: match_rate,
        speed_relative: Number(speed_wpm) - 140,
        total_score: scores.total_score,
        match_score: scores.match_score,
        eye_score: scores.eye_score,
        speed_score: scores.speed_score,
        filler_score: scores.filler_score,
        pitch_score: scores.pitch_score,
        pitch_std: Number(pitch_std),
        filler_word_count: Number(filler_word_count),
        speed_wpm: Number(speed_wpm),
        eye_contact_rate: Math.round(Number(eye_contact_rate) * 100),
        created_at
      });

      fs.unlinkSync(pcmPath);
      fs.unlinkSync(wavPath);

      res.json({
        success: true,
        session_id: sessionId,
        feedback_id: feedbackId,
        feedback: {
          raw_metrics: {
            script_match_rate: match_rate,
            eye_contact_rate: Math.round(Number(eye_contact_rate) * 100),
            speed_wpm: Number(speed_wpm),
            filler_word_count: Number(filler_word_count),
            pitch_std: Number(pitch_std)
          },
          scores: {
            script_score: scores.match_score,
            eye_score: scores.eye_score,
            speed_score: scores.speed_score,
            filler_score: scores.filler_score,
            pitch_score: scores.pitch_score,
            total_score: scores.total_score
          },
          summary,
          improvement_tips: [improvement_tips]
        }
      });

    } catch (err) {
      console.error("❌ 분석 또는 DB 저장 중 오류:", err.message);
      fs.unlinkSync(pcmPath);
      if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);
      res.status(500).send(err.message);
    }
  });
};

