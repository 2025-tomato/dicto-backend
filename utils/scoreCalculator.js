exports.calculateDetailedScores = (match_rate, eye_contact_rate, speed_wpm, filler_word_count, pitch_std) => {
    let match_score = match_rate >= 95 ? 30 : match_rate >= 90 ? 27 :
                      match_rate >= 85 ? 24 : match_rate >= 80 ? 20 :
                      match_rate >= 70 ? 15 : match_rate >= 60 ? 10 : 5;
  
    let eye_score = eye_contact_rate >= 0.80 ? 25 : eye_contact_rate >= 0.65 ? 21 :
                    eye_contact_rate >= 0.50 ? 17 : eye_contact_rate >= 0.35 ? 11 : 6;
  
    let speed_score = (speed_wpm >= 140 && speed_wpm <= 160) ? 15 :
                      (speed_wpm >= 130 && speed_wpm <= 139) || (speed_wpm >= 161 && speed_wpm <= 170) ? 13 :
                      (speed_wpm >= 120 && speed_wpm <= 129) || (speed_wpm >= 171 && speed_wpm <= 180) ? 10 :
                      (speed_wpm >= 100 && speed_wpm <= 119) || (speed_wpm >= 181 && speed_wpm <= 200) ? 6 : 3;
  
    let filler_score = filler_word_count <= 3 ? 15 : filler_word_count <= 6 ? 13 :
                       filler_word_count <= 10 ? 10 : filler_word_count <= 15 ? 6 : 3;
  
    let pitch_score = pitch_std <= 20 ? 15 : pitch_std <= 30 ? 13 :
                      pitch_std <= 40 ? 10 : pitch_std <= 50 ? 6 : 3;
  
    return {
      match_score, eye_score, speed_score, filler_score, pitch_score,
      total_score: match_score + eye_score + speed_score + filler_score + pitch_score
    };
  };
  