import fs from 'fs'
import path from 'path'

// 학교생활기록부 기재 원칙 프롬프트 로드
export function loadSchoolRecordGuidelines(): string {
  try {
    const guidelinesPath = path.join(process.cwd(), 'src', 'prompts', 'school-record-guidelines.md')
    return fs.readFileSync(guidelinesPath, 'utf-8')
  } catch (error) {
    console.error('학교생활기록부 기재 원칙 파일을 읽을 수 없습니다:', error)
    return ''
  }
}

// 기재 금지 항목 체크 (상세한 피드백 포함)
export function validateSchoolRecord(content: string): { isValid: boolean; violations: Array<{ type: string; found: string; context: string; suggestion: string; severity: 'critical' | 'warning' | 'minor' }> } {
  const violations: Array<{ type: string; found: string; context: string; suggestion: string; severity: 'critical' | 'warning' | 'minor' }> = []
  
  // 문장별로 분석하여 컨텍스트 제공
  const sentences = content.split(/[.!?。]/g).filter(s => s.trim().length > 0)
  
  sentences.forEach((sentence, index) => {
    const trimmedSentence = sentence.trim()
    if (!trimmedSentence) return
    
    // 공인어학성적 체크
    const languageTests = [
      { keyword: '토익', full: 'TOEIC' },
      { keyword: 'TOEIC', full: 'TOEIC' },
      { keyword: '토플', full: 'TOEFL' },
      { keyword: 'TOEFL', full: 'TOEFL' },
      { keyword: '텝스', full: 'TEPS' },
      { keyword: 'TEPS', full: 'TEPS' },
      { keyword: 'HSK', full: 'HSK' },
      { keyword: '아이엘츠', full: 'IELTS' },
      { keyword: 'IELTS', full: 'IELTS' }
    ]
    
    languageTests.forEach(test => {
      if (trimmedSentence.includes(test.keyword)) {
        violations.push({
          type: '공인어학성적 언급 금지',
          found: test.keyword,
          context: `"${trimmedSentence}"`,
          suggestion: '공인어학성적(토익, 토플, 텝스 등) 언급은 금지됩니다. 대신 "영어 의사소통 능력 향상을 위해 노력함" 등으로 표현하세요.',
          severity: 'critical'
        })
      }
    })
    
    // 외부 수상실적 관련 키워드
    const externalAwards = ['전국대회', '국제대회', '올림피아드', '공모전', '경진대회', '교외대회']
    externalAwards.forEach(award => {
      if (trimmedSentence.includes(award)) {
        violations.push({
          type: '외부 수상실적 언급 의심',
          found: award,
          context: `"${trimmedSentence}"`,
          suggestion: '교외 기관에서 주최하는 대회나 수상 실적은 기재할 수 없습니다. 교내 활동으로 대체하거나 관련 역량을 다른 방식으로 표현하세요.',
          severity: 'critical'
        })
      }
    })
    
    // 논문/학회 관련 키워드 (발표는 맥락 고려)
    const academicKeywords = [
      { keyword: '논문', suggestion: '논문 작성이나 게재는 기재할 수 없습니다.' },
      { keyword: '학회', suggestion: '학회 발표나 참가는 기재할 수 없습니다.' },
      { keyword: 'KCI', suggestion: '학술지 관련 내용은 기재할 수 없습니다.' },
      { keyword: '게재', suggestion: '논문이나 글의 게재는 기재할 수 없습니다.' },
      { keyword: '투고', suggestion: '논문 투고는 기재할 수 없습니다.' }
    ]
    
    academicKeywords.forEach(item => {
      if (trimmedSentence.includes(item.keyword)) {
        violations.push({
          type: '논문/학회 관련 내용 금지',
          found: item.keyword,
          context: `"${trimmedSentence}"`,
          suggestion: item.suggestion + ' 대신 교내 발표나 탐구 활동으로 표현하세요.',
          severity: 'critical'
        })
      }
    })
    
    // '발표'는 논문/학회 발표가 아닌 일반 발표인지 확인
    if (trimmedSentence.includes('발표')) {
      const academicContext = ['논문', '학회', '연구', '학술', '저널', '게재'].some(word => 
        trimmedSentence.includes(word) || content.includes(word)
      )
      if (academicContext) {
        violations.push({
          type: '논문/학회 관련 발표 금지',
          found: '발표',
          context: `"${trimmedSentence}"`,
          suggestion: '논문이나 학회 발표는 기재할 수 없습니다. 교내 수업 발표나 동아리 발표 활동으로 수정하세요.',
          severity: 'critical'
        })
      }
    }
    
    // 부모/가족 정보 관련 키워드
    const familyKeywords = [
      { keyword: '서울대학교', suggestion: '특정 대학명 언급은 금지됩니다.' },
      { keyword: '서울대', suggestion: '특정 대학명 언급은 금지됩니다.' },
      { keyword: '형의 조언', suggestion: '가족 구성원의 배경이나 조언 언급은 금지됩니다.' },
      { keyword: '아버지', suggestion: '부모/가족 정보 언급은 금지됩니다.' },
      { keyword: '어머니', suggestion: '부모/가족 정보 언급은 금지됩니다.' },
      { keyword: '부모님', suggestion: '부모/가족 정보 언급은 금지됩니다.' },
      { keyword: '가족', suggestion: '가족 정보 언급은 금지됩니다.' }
    ]
    
    familyKeywords.forEach(item => {
      if (trimmedSentence.includes(item.keyword)) {
        violations.push({
          type: '부모/가족/대학 정보 언급 금지',
          found: item.keyword,
          context: `"${trimmedSentence}"`,
          suggestion: item.suggestion + ' 학생 본인의 활동과 노력에 초점을 맞춰 작성하세요.',
          severity: 'critical'
        })
      }
    })
    
    // 1인칭 시점 체크
    const firstPersonWords = ['저는', '제가', '나는', '내가', '본인이']
    firstPersonWords.forEach(word => {
      if (trimmedSentence.includes(word)) {
        violations.push({
          type: '1인칭 시점 사용 금지',
          found: word,
          context: `"${trimmedSentence}"`,
          suggestion: '1인칭 시점은 사용할 수 없습니다. "학생은" 또는 주어를 생략하고 3인칭 관찰자 시점으로 작성하세요.',
          severity: 'warning'
        })
      }
    })
    
    // 축약어 체크
    const abbreviations = [
      { keyword: '생기부', full: '학교생활기록부' },
      { keyword: '세특', full: '세부능력 및 특기사항' },
      { keyword: 'R&E', full: '연구개발(R&E)' }
    ]
    
    abbreviations.forEach(abbr => {
      if (trimmedSentence.includes(abbr.keyword)) {
        violations.push({
          type: '축약어 사용 금지',
          found: abbr.keyword,
          context: `"${trimmedSentence}"`,
          suggestion: `축약어 "${abbr.keyword}"는 사용할 수 없습니다. "${abbr.full}"로 정식 명칭을 사용하세요.`,
          severity: 'minor'
        })
      }
    })
    
    // 명사형 어미 체크
    const wrongEndings = [
      { keyword: '합니다', correct: '함' },
      { keyword: '했습니다', correct: '함' },
      { keyword: '입니다', correct: '임' },
      { keyword: '였습니다', correct: '였음' },
      { keyword: '했다', correct: '함' },
      { keyword: '한다', correct: '함' },
      { keyword: '이다', correct: '임' }
    ]
    
    wrongEndings.forEach(ending => {
      if (trimmedSentence.includes(ending.keyword)) {
        violations.push({
          type: '명사형 어미 사용 필요',
          found: ending.keyword,
          context: `"${trimmedSentence}"`,
          suggestion: `"${ending.keyword}"를 "${ending.correct}" 등의 명사형 어미로 수정하세요. 학교생활기록부는 명사형 어미로 종결해야 합니다.`,
          severity: 'warning'
        })
      }
    })
    
    // 과도한 칭찬 표현 체크
    const excessivePraise = ['뛰어난', '훌륭한', '탁월한', '최고의', '완벽한']
    excessivePraise.forEach(praise => {
      if (trimmedSentence.includes(praise)) {
        violations.push({
          type: '과도한 칭찬 표현 지양',
          found: praise,
          context: `"${trimmedSentence}"`,
          suggestion: `"${praise}" 같은 과도한 칭찬보다는 구체적인 행동과 결과를 객관적으로 서술하세요.`,
          severity: 'minor'
        })
      }
    })
  })
  
  return {
    isValid: violations.length === 0,
    violations
  }
}

// 학교생활기록부 작성을 위한 시스템 프롬프트 생성 (기존 함수 - 호환성 유지)
export function createSchoolRecordSystemPrompt(): string {
  const guidelines = loadSchoolRecordGuidelines()
  
  return `당신은 학교생활기록부 작성 전문가입니다. 다음 기재 원칙과 점검 기준을 반드시 준수하여 학교생활기록부를 작성하거나 수정해주세요.

${guidelines}

## 중요 지침:
1. 위의 모든 기재 원칙과 점검 기준을 반드시 준수해주세요.
2. 기재 금지 항목은 절대로 포함하지 마세요.
3. 모든 문장은 명사형 어미(~함, ~음, ~됨)로 종결해주세요.
4. 학생 고유의 특성이 드러나도록 구체적이고 개별화된 내용으로 작성해주세요.
5. 과정 중심으로 서술하며, 자기주도적 활동을 부각해주세요.

작성하거나 수정한 내용이 위 기준에 부합하는지 스스로 검토한 후 최종 결과를 제공해주세요.`
}

// 토큰 최적화된 학교생활기록부 시스템 프롬프트 생성
export function createOptimizedSchoolRecordPrompt(messages: any[], isContinuation: boolean = false): string {
  // 연속 요청인 경우 간소화된 프롬프트 사용
  if (isContinuation) {
    return `학교생활기록부 작성 전문가로서 이전 내용에 이어서 작성해주세요.

핵심 원칙:
- 명사형 어미(~함, ~음, ~됨) 사용
- 기재 금지 항목 절대 금지: 공인어학성적, 외부수상, 논문/학회, 부모정보, 특정대학명
- 구체적이고 개별화된 내용으로 작성
- 과정 중심 서술, 자기주도적 활동 부각`
  }

  // 질문 내용에 따른 관련 가이드라인만 추출
  const lastUserMessage = messages[messages.length - 1]?.content || ''
  const relevantGuidelines = extractRelevantGuidelines(lastUserMessage)

  return `학교생활기록부 작성 전문가입니다. 다음 기재 원칙을 준수하여 작성해주세요.

${relevantGuidelines}

핵심 지침:
1. 기재 금지 항목 절대 금지: 공인어학성적, 외부수상실적, 논문/학회발표, 부모/가족정보, 특정대학명
2. 명사형 어미(~함, ~음, ~됨) 사용 필수
3. 구체적 사례와 근거로 학생 고유 특성 표현
4. 과정 중심 서술, 자기주도적 활동 부각
5. 객관적 사실 기반 작성`
}

// 질문 내용에 따른 관련 가이드라인 추출
function extractRelevantGuidelines(userMessage: string): string {
  const guidelines = loadSchoolRecordGuidelines()
  const lowerMessage = userMessage.toLowerCase()
  
  // 키워드별 관련 섹션 매핑
  const sectionMap = {
    '세특': '### 교과학습발달상황 (세부능력 및 특기사항)',
    '세부능력': '### 교과학습발달상황 (세부능력 및 특기사항)',
    '특기사항': '### 교과학습발달상황 (세부능력 및 특기사항)',
    '동아리': '#### 동아리활동 (연 500자)',
    '자율활동': '#### 자율활동 (연 500자)',
    '봉사': '#### 봉사활동',
    '진로': '#### 진로활동 (연 700자)',
    '독서': '### 독서활동상황',
    '행동특성': '### 행동특성 및 종합의견 (연 500자)',
    '종합의견': '### 행동특성 및 종합의견 (연 500자)'
  }

  // 관련 섹션 찾기
  const relevantSections = []
  for (const [keyword, section] of Object.entries(sectionMap)) {
    if (lowerMessage.includes(keyword)) {
      const sectionStart = guidelines.indexOf(section)
      if (sectionStart !== -1) {
        const nextSectionStart = guidelines.indexOf('###', sectionStart + 1)
        const sectionEnd = nextSectionStart !== -1 ? nextSectionStart : guidelines.length
        relevantSections.push(guidelines.substring(sectionStart, sectionEnd).trim())
      }
    }
  }

  // 관련 섹션이 있으면 해당 섹션만, 없으면 핵심 원칙만 반환
  if (relevantSections.length > 0) {
    return `## 관련 기재 원칙:\n${relevantSections.join('\n\n')}\n\n## 공통 기재 원칙:\n- 객관성: 교사가 직접 관찰한 사실 기반\n- 과정 중심: 동기, 과정, 성장, 변화 중심\n- 구체성: 구체적 사례와 근거 제시\n- 개별화: 학생 고유 특성 표현\n- 자기주도성: 학생 주도적 역할과 노력 부각`
  }

  // 기본 핵심 원칙만 반환 (토큰 대폭 절약)
  return `## 핵심 기재 원칙:
- 객관성: 교사가 직접 관찰한 사실에 근거
- 과정 중심: 결과보다 동기, 과정, 성장, 변화 중심
- 구체성: 추상적 표현 지양, 구체적 사례와 근거 제시
- 개별화: 학생 고유의 특성과 역량 표현
- 자기주도성: 학생이 주도한 역할, 노력, 탐구과정 부각

## 주요 금지사항:
- 공인어학성적 (토익, 토플, 텝스, HSK 등)
- 외부 수상실적 (교외 기관 수상)
- 논문/학회 발표 관련 내용
- 부모/가족 정보 (직업, 직장, 사회경제적 지위)
- 특정 대학명, 기관명 언급
- 1인칭 시점 ('저는', '제가' 등)
- 축약어 ('생기부', '세특' → '학교생활기록부', '세부능력 및 특기사항')`
}

// 메시지 컨텍스트 최적화 함수
export function optimizeMessageContext(messages: any[], isSchoolRecord: boolean, isContinuation: boolean): any[] {
  if (messages.length <= 3) {
    return messages // 짧은 대화는 그대로 유지
  }

  // 연속 요청인 경우 최근 메시지만 유지
  if (isContinuation) {
    return messages.slice(-3) // 최근 3개 메시지만
  }

  // 일반적인 경우: 스마트 컨텍스트 윈도우
  const maxMessages = isSchoolRecord ? 6 : 8 // 학생부 모드는 더 적은 컨텍스트
  
  if (messages.length <= maxMessages) {
    return messages
  }

  // 중요한 메시지 선별
  const recentMessages = messages.slice(-4) // 최근 4개는 항상 포함
  const olderMessages = messages.slice(0, -4)
  
  // 긴 메시지나 중요한 키워드가 포함된 메시지 우선 선택
  const importantMessages = olderMessages.filter(msg => {
    if (msg.role === 'user') {
      return msg.content.length > 50 || 
             msg.content.includes('세특') || 
             msg.content.includes('학생부') ||
             msg.content.includes('동아리') ||
             msg.content.includes('진로')
    }
    return msg.content.length > 200 // 긴 AI 응답
  }).slice(-2) // 최대 2개만

  return [...importantMessages, ...recentMessages]
}

// 파일 내용 최적화 함수
export function optimizeFileContent(content: string, maxLength: number = 2000): string {
  if (content.length <= maxLength) {
    return content
  }

  // 중요한 섹션 우선 추출
  const lines = content.split('\n')
  const importantLines = []
  const normalLines = []

  for (const line of lines) {
    if (line.includes('##') || line.includes('###') || 
        line.includes('중요') || line.includes('핵심') ||
        line.includes('필수') || line.includes('금지')) {
      importantLines.push(line)
    } else if (line.trim().length > 0) {
      normalLines.push(line)
    }
  }

  // 중요한 내용 우선, 나머지는 길이에 맞춰 추가
  let result = importantLines.join('\n')
  
  for (const line of normalLines) {
    if (result.length + line.length + 1 <= maxLength) {
      result += '\n' + line
    } else {
      break
    }
  }

  if (result.length < content.length) {
    result += '\n\n[... 내용 일부 생략 ...]'
  }

  return result
}

// 토큰 사용량 추정 함수 (대략적)
export function estimateTokens(messages: any[]): number {
  let totalTokens = 0
  
  for (const message of messages) {
    // 대략적인 토큰 계산: 한글 1자 ≈ 1.5토큰, 영문 4자 ≈ 1토큰
    const content = message.content || ''
    const koreanChars = (content.match(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/g) || []).length
    const otherChars = content.length - koreanChars
    
    totalTokens += Math.ceil(koreanChars * 1.5 + otherChars / 4)
  }
  
  return totalTokens
}
