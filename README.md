# 🎙️ Dicto Backend

OpenAI Whisper API와 Python을 활용한 음성-텍스트 변환 서버

## ✨ 주요 기능

- **음성 파일 업로드**: WAV, MP3, M4A 등 다양한 포맷 지원
- **음성-텍스트 변환**: OpenAI Whisper API + Python 스크립트 활용
- **Firebase 연동**: 사용자 인증 및 데이터 관리
- **파일 관리**: Multer를 통한 안전한 파일 업로드 처리
- **CORS 지원**: 다양한 클라이언트와의 연동 가능

## 🛠️ 기술 스택

- **Backend**: Node.js, Express.js
- **AI**: OpenAI Whisper API
- **Database**: Firebase Admin SDK
- **File Upload**: Multer
- **Python Integration**: Python subprocess
- **Language**: JavaScript, Python

## 📋 설치 및 실행

### 1. 프로젝트 클론
```bash
git clone https://github.com/2025-tomato/dicto-backend.git
cd dicto-backend
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 환경 변수 설정
프로젝트 루트에 `.env` 파일 생성:
```env
OPENAI_API_KEY=your_openai_api_key_here
FIREBASE_PROJECT_ID=your_firebase_project_id
PORT=3000
NODE_ENV=development
```

### 4. Firebase 설정
- Firebase 콘솔에서 서비스 계정 키 JSON 파일 다운로드
- 프로젝트 루트 디렉토리에 배치
- `firebase.js` 파일에서 경로 확인

### 5. Python 환경 설정
```bash
# Python 의존성 설치 (필요시)
pip install openai-whisper
```

### 6. 서버 실행
```bash
# 개발 모드
npm run dev

# 또는 기본 실행
node index.js
```

서버가 `http://localhost:3000`에서 실행됩니다.

## 📡 API 엔드포인트

### 음성 파일 업로드 및 변환
```bash
POST /api/transcribe
```

**요청 예시:**
```bash
curl -X POST http://localhost:3000/api/transcribe \
  -F "audio=@your-audio-file.wav"
```

**응답 예시:**
```json
{
  "success": true,
  "transcript": "안녕하세요. 이것은 변환된 텍스트입니다.",
  "confidence": 0.95,
  "processing_time": 2.3
}
```

### 기타 엔드포인트
자세한 API 문서는 `routes/` 폴더의 파일들을 참조하세요.

## 📁 프로젝트 구조

```
dicto-backend/
├── controllers/          # 비즈니스 로직 컨트롤러
├── routes/              # Express 라우트 정의
├── utils/               # 유틸리티 함수들
├── uploads/             # 임시 파일 저장 디렉토리
├── firebase.js          # Firebase Admin SDK 설정
├── index.js             # Express 서버 메인 파일
├── transcribe.py        # Python Whisper 처리 스크립트
├── package.json         # Node.js 의존성 관리
└── .gitignore          # Git 제외 파일 설정
```

## ⚙️ 환경 요구사항

### 필수 설정
- **Node.js**: 16.0 이상
- **Python**: 3.8 이상 (transcribe.py 실행용)
- **OpenAI API Key**: [OpenAI Platform](https://platform.openai.com/)에서 발급
- **Firebase Project**: [Firebase Console](https://console.firebase.google.com/)에서 설정

### 지원 오디오 형식
- pcm, WAV
- 최대 파일 크기: 25MB (OpenAI 제한)

## 🔧 개발 가이드

### 로컬 개발 환경 설정
1. 환경 변수 파일 생성
2. Firebase 서비스 계정 키 설정
3. Python 환경 확인
4. `npm start` 또는 `node index.js`로 서버 실행

### 주요 컴포넌트
- **index.js**: Express 서버 설정 및 미들웨어
- **firebase.js**: Firebase Admin 초기화
- **transcribe.py**: Python Whisper 스크립트
- **controllers/**: API 로직 처리
- **routes/**: 라우트 정의 및 관리

## 🚨 보안 주의사항

- `.env` 파일과 Firebase JSON 키는 절대 Git에 커밋하지 마세요
- API 키는 환경 변수로 관리하세요
- 업로드된 파일은 처리 후 자동 삭제됩니다

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/새기능`)
3. Commit your Changes (`git commit -m '새 기능 추가'`)
4. Push to the Branch (`git push origin feature/새기능`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 ISC 라이선스를 따릅니다.

## 🐛 문제 해결

### 자주 발생하는 문제들

**1. Python 스크립트 실행 오류**
```bash
# Python 경로 확인
which python3
```

**2. Firebase 연결 오류**
- 서비스 계정 키 파일 경로 확인
- Firebase 프로젝트 ID 확인

**3. OpenAI API 오류**
- API 키 유효성 확인
- 계정 잔액 및 사용량 한도 확인
