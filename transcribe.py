import sys
import whisper
import librosa
import numpy as np
import json
import parselmouth
import subprocess
import os
import tempfile

try:
    # 입력 파일 경로 받기 (pcm 또는 잘못된 wav일 수 있음)
    input_path = sys.argv[1]
    nput_path = os.path.abspath(input_path)

    print(f"[Python] 입력 경로: {input_path}", file=sys.stderr)
    print(f"[Python] 존재합니까? {os.path.exists(input_path)}", file=sys.stderr)

    if not os.path.exists(input_path):
        raise FileNotFoundError(f"❌ 파일을 찾을 수 없습니다: {input_path}")

    # FFmpeg로 변환할 임시 출력 파일 경로 생성 (.wav)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_wav:
        converted_path = tmp_wav.name

    # 1. FFmpeg로 16kHz, mono, 16bit PCM 포맷으로 변환
    ffmpeg_cmd = [
        "ffmpeg", "-y",  # 덮어쓰기 허용
        "-f", "s16le",   # 입력 포맷: 16bit PCM little endian
        "-ar", "16000",  # 샘플레이트
        "-ac", "1",      # 모노
        "-i", input_path,
        converted_path
    ]
    # subprocess.run(ffmpeg_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    subprocess.run(ffmpeg_cmd, check=True)

    # 2. Whisper로 텍스트 추출
    model = whisper.load_model("small")
    result = model.transcribe(converted_path, language="ko")
    transcript = result["text"].strip()

    # 3. 음성 길이 계산
    duration = librosa.get_duration(filename=converted_path)

    # 4. 말 속도 계산 (단어 수 / 분)
    word_count = len(transcript.split())
    speed_wpm = round((word_count / duration) * 60, 2)

    # 5. 습관어 분석
    filler_words = ["음", "어", "그", "저", "um", "uh", "like"]
    filler_word_count = sum(transcript.count(word) for word in filler_words)

    # 6. pitch 분석
    snd = parselmouth.Sound(converted_path)
    pitch = snd.to_pitch()
    pitch_values = pitch.selected_array["frequency"]
    valid_pitch = [p for p in pitch_values if p > 0]
    pitch_std = round(np.std(valid_pitch), 2) if valid_pitch else 0.0

    print(f"[Python][DEBUG] pitch_values[:30]: {pitch_values[:30]}", file=sys.stderr)
    print(f"[Python][DEBUG] valid_pitch[:30]: {valid_pitch[:30]}", file=sys.stderr)
    print(f"[Python][DEBUG] pitch_std: {pitch_std}", file=sys.stderr)

    # 결과 출력
    output = {
        "transcription": transcript,
        "speed_wpm": speed_wpm,
        "filler_word_count": filler_word_count,
        "pitch_std": pitch_std,
        "speech_duration": round(duration)
    }

    print(json.dumps(output, ensure_ascii=False))

    os.remove(converted_path)

except Exception as e:
    print(json.dumps({"error": str(e)}))
    sys.exit(1)
