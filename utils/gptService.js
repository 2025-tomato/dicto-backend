require("dotenv").config(); 

const { OpenAI } = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * 발표 전체 평가와 개선 방향 2문장을 한 줄씩 생성 (gpt-3.5-turbo)
 */
async function generateImprovementSummary(data) {
  const { totalScore, scores, tips } = data;

  const prompt = `
당신은 발표 피드백을 작성하는 AI 코치입니다.

분석 점수는 다음과 같습니다:
- 총점: ${totalScore}/100
- 스크립트 일치도: ${scores.match_score}/30
- 시선 처리: ${scores.eye_score}/25
- 발화 속도: ${scores.speed_score}/15
- 말버릇 빈도: ${scores.filler_score}/15
- 음성 높낮이 안정성: ${scores.pitch_score}/15

개선 팁 목록:
${tips.length > 0 ? tips.map((t, i) => `${i + 1}. ${t}`).join("\n") : "없음"}

아래 형식으로 자연스럽고 회화체로 작성된 문장 두 개만 출력해줘:
- 첫 문장: 발표 전체에 대한 종합 평가
- 두 번째 문장: 개선 사항이 있다면 부족한 사항에 대한 종합적인 방향 제안해주고, 만약 총점이 95점 이상이면 '대체로 안정적이에요'로 평가

조건:
- 각 문장은 한 줄씩 줄바꿈으로 구분해줘
- "~했어요", "~해요", "~돼요", "~될 거예요" 등 자연스러운 회화체 말투로 끝내줘
- "했습니다.-요"처럼 부자연스럽게 붙이지 말고, 문장을 완성된 형태로 써줘
- 두 번째 문장에서 만약 총점이 90점 이상이면 개선 사항이 거의 없다고 표현해줘.
- 번호를 붙이지 말고, 문장만 출력해줘

예시 문장:
시선과 속도 모두 안정적이에요.  
시선 처리를 조금 더 개선하면 발표 완성도가 높아질 거예요.

`;

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
  });

  const output = completion.choices[0].message.content.trim();
  const [summary, improvement] = output.split(/\n+/).map(s => s.trim());

  return { summary, improvement_tips: improvement };
}



/**
 * 두 세션 피드백을 비교해 요약 문장과 개선 방향을 생성
 */
async function generateSessionComparisonSummary(fb1, fb2) {
    const prompt = `
  당신은 발표 분석 전문가예요.  
아래는 두 번의 발표 분석 결과예요.

[이전 발표]
- 스크립트 일치도: ${fb1.script_match_rate}%
- 시선 처리: ${fb1.eye_contact_rate}%
- 발화 속도: ${fb1.speed_wpm}WPM
- 말버릇 수: ${fb1.filler_word_count}회
- 음성 높낮이 변화: ${fb1.pitch_std}
- 총점: ${fb1.total_score}점

[현재 발표]
- 스크립트 일치도: ${fb2.script_match_rate}%
- 시선 처리: ${fb2.eye_contact_rate}%
- 발화 속도: ${fb2.speed_wpm}WPM
- 말버릇 수: ${fb2.filler_word_count}회
- 음성 높낮이 변화: ${fb2.pitch_std}
- 총점: ${fb2.total_score}점

아래 조건에 맞춰 자연스럽고 회화체로 구성된 두 문장만 출력해줘:

- 첫 문장: 이전 발표와 비교한 현재 발표의 요약을 해줘
- 두 번째 문장: 비교 결과 개선이 필요하다면 제안해주고, 없으면 '대체로 개선되었어요'로 마무리

조건:
- 두 문장은 줄바꿈으로 구분해줘
- 모든 문장은 "~했어요", "~해요", "~돼요", "~될 거예요" 같은 회화체 종결어미로 끝내줘
- "했습니다.-요" 같은 어색한 형식은 절대 사용하지 말아줘
- 문장 앞에 번호를 붙이지 말고, 문장만 자연스럽게 출력해줘

예시 문장:  
스크립트 일치도는 향상되었으나 시선 집중도가 다소 낮아졌어요.  
시선 처리를 조금 더 개선하면 발표 완성도가 높아질 거예요.
  `;
  
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
    });
  
    const output = completion.choices[0].message.content.trim();
    const [summary, suggestion] = output.split(/\n+/).map(line => line.trim());
  
    return { summary, suggestion };
  }
  
  module.exports = {
    generateImprovementSummary,
    generateSessionComparisonSummary
  };
