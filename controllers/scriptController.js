const fs = require("fs");
const path = require("path");
const admin = require("../firebase");
const db = admin.firestore();

//스크립트 업로드
exports.uploadScript = async (req, res) => {
    try {
      console.log("req.body:", req.body);  
      console.log("req.file:", req.file); 

      const { device_uuid } = req.body;
  
      if (!device_uuid || !req.file) {
        return res.status(400).json({ success: false, message: "필수 데이터 누락" });
      }
  
      const filePath = req.file.path;
      const originalFileName = req.file.originalname;
      const title = path.parse(originalFileName).name; 
      const content = fs.readFileSync(filePath, "utf-8");

      const crypto = require("crypto");

      const contentHash = crypto
  .createHash("sha256")
  .update(content)
  .digest("hex");


      const existingScriptSnapshot = await db.collection("scripts")
      .where("device_uuid","==",device_uuid)
      .where("content_hash","==",contentHash)
      .limit(1)
      .get();

      //기존에 생성된 스크립트라면
      if(!existingScriptSnapshot.empty){
        const existingScript = existingScriptSnapshot.docs[0].data();
        fs.unlinkSync(filePath);
        return res.status(200).json({success: true, script_id: existingScript.script_id});
    
      }
  
      //새로운 스크립트면 uuid 생성
      const scriptId = `script-${Date.now()}`;
      const created_at = admin.firestore.FieldValue.serverTimestamp();

      const decodeTitle = (title) => {
        try {
          return Buffer.from(title, 'latin1').toString('utf8');
        } catch (e) {
          return title; // 디코딩 실패 시 원본 반환
        }
      };
  
      await db.collection("scripts").doc(scriptId).set({
        script_id: scriptId,
        device_uuid,
        title: decodeTitle(title),
        content,
        content_hash: contentHash,
        created_at
      });
  
      fs.unlinkSync(filePath);
  
      res.status(201).json({ success: true, script_id: scriptId });
      
    } catch (error) {
      console.error("스크립트 저장 오류:", error);
      res.status(500).json({ success: false, message: "서버 오류", error: error.message || error.toString() });
    }
  };

  //스크립트 삭제
  exports.deleteScript = async(req, res) => {
    try{
        const{script_id} = req.params;

        if(!script_id){
            return res.status(400).json({
                success:false,
                message:"필수 파라미터 누락"
            });
        }

        const scriptDoc = await db.collection("scripts").doc(script_id).get();

        if(!scriptDoc.exists){
            return res.status(404).json({
                success: false,
                message : "스크립트를 찾을 수 없습니다."
            });
        }

        const folderSnap = await db.collection("folders")
      .where("script_id", "==", script_id)
      .limit(1)
      .get();

        if (!folderSnap.empty) {
          return res.status(409).json({ 
            success: false,
            message: "해당 스크립트로 생성된 폴더가 존재하므로 삭제할 수 없습니다."
          });
        }

        await db.collection("scripts").doc(script_id).delete();

        return res.status(200).json({
            success:true,
            message:"스크립트가 삭제되었습니다."
        });

        
    }catch(error){
        console.error("스크립트 삭제 오류: ",error);
        return res.status(500).json({
            success:false,
            message:"서버 오류",
            error : error.message || error.toString()
        });
    }
  }