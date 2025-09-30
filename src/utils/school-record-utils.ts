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

// 기재 금지 항목 체크
export function validateSchoolRecord(content: string): { isValid: boolean; violations: string[] } {
  const violations: string[] = []
  
  // 공인어학성적 체크
  const languageTests = ['토익', 'TOEIC', '토플', 'TOEFL', '텝스', 'TEPS', 'HSK', '아이엘츠', 'IELTS']
  languageTests.forEach(test => {
    if (content.includes(test)) {
      violations.push(`공인어학성적 언급 금지: ${test}`)
    }
  })
  
  // 외부 수상실적 관련 키워드
  const externalAwards = ['전국대회', '국제대회', '올림피아드', '공모전', '경진대회']
  externalAwards.forEach(award => {
    if (content.includes(award)) {
      violations.push(`외부 수상실적 의심: ${award}`)
    }
  })
  
  // 논문/학회 관련 키워드
  const academicKeywords = ['논문', '학회', 'KCI', '발표', '게재', '투고']
  academicKeywords.forEach(keyword => {
    if (content.includes(keyword)) {
      violations.push(`논문/학회 관련 내용 금지: ${keyword}`)
    }
  })
  
  // 부모/가족 정보 관련 키워드
  const familyKeywords = ['아버지', '어머니', '부모님', '가족', '직장', '회사', '대표', '사장', '의사', '변호사', '교수']
  familyKeywords.forEach(keyword => {
    if (content.includes(keyword)) {
      violations.push(`부모/가족 정보 언급 금지: ${keyword}`)
    }
  })
  
  // 특정 대학명 체크 (일부 예시)
  const universities = ['서울대', '연세대', '고려대', '카이스트', 'KAIST', '포스텍', 'POSTECH']
  universities.forEach(univ => {
    if (content.includes(univ)) {
      violations.push(`특정 대학명 언급 금지: ${univ}`)
    }
  })
  
  // 1인칭 시점 체크
  const firstPersonWords = ['저는', '제가', '나는', '내가']
  firstPersonWords.forEach(word => {
    if (content.includes(word)) {
      violations.push(`1인칭 시점 사용 금지: ${word}`)
    }
  })
  
  // 축약어 체크
  const abbreviations = ['생기부', '세특', 'R&E']
  abbreviations.forEach(abbr => {
    if (content.includes(abbr)) {
      violations.push(`축약어 사용 금지: ${abbr}`)
    }
  })
  
  // 명사형 어미 체크 (간단한 패턴 체크)
  const wrongEndings = ['합니다', '했습니다', '입니다', '였습니다', '했다', '한다', '이다']
  wrongEndings.forEach(ending => {
    if (content.includes(ending)) {
      violations.push(`명사형 어미 사용 필요: ${ending} → ~함, ~음, ~됨 형태로 수정`)
    }
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
