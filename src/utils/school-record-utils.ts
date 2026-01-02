import fs from 'fs'
import path from 'path'

// 검증 규칙 타입 정의
interface ValidationRule {
  keyword?: string
  keywords?: string[]
  full?: string
  correct?: string
  type: string
  severity: 'critical' | 'warning' | 'minor'
  suggestion: string
}

interface ValidationRules {
  prohibitedItems: {
    languageTests: ValidationRule[]
    externalAwards: ValidationRule[]
    academicKeywords: ValidationRule[]
    familyKeywords: ValidationRule[]
  }
  styleRules: {
    firstPersonWords: ValidationRule[]
    abbreviations: ValidationRule[]
    wrongEndings: ValidationRule[]
    excessivePraise: ValidationRule[]
  }
  academicContextKeywords: string[]
}

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

// 검증 규칙 동적 로드
export function loadValidationRules(): ValidationRules {
  try {
    const rulesPath = path.join(process.cwd(), 'src', 'prompts', 'validation-rules.json')
    const rulesContent = fs.readFileSync(rulesPath, 'utf-8')
    return JSON.parse(rulesContent)
  } catch (error) {
    console.error('검증 규칙 파일을 읽을 수 없습니다:', error)
    // 기본 규칙 반환
    return {
      prohibitedItems: {
        languageTests: [],
        externalAwards: [],
        academicKeywords: [],
        familyKeywords: []
      },
      styleRules: {
        firstPersonWords: [],
        abbreviations: [],
        wrongEndings: [],
        excessivePraise: []
      },
      academicContextKeywords: []
    }
  }
}

// 기재 금지 항목 체크 (동적 규칙 로딩)
export function validateSchoolRecord(content: string): { isValid: boolean; violations: Array<{ type: string; found: string; context: string; suggestion: string; severity: 'critical' | 'warning' | 'minor' }> } {
  const violations: Array<{ type: string; found: string; context: string; suggestion: string; severity: 'critical' | 'warning' | 'minor' }> = []
  
  // 검증 규칙 동적 로드
  const rules = loadValidationRules()
  
  // 문장별로 분석하여 컨텍스트 제공
  const sentences = content.split(/[.!?。]/g).filter(s => s.trim().length > 0)
  
  sentences.forEach((sentence, index) => {
    const trimmedSentence = sentence.trim()
    if (!trimmedSentence) return
    
    // 공인어학성적 체크
    rules.prohibitedItems.languageTests.forEach(rule => {
      rule.keywords?.forEach(keyword => {
        if (trimmedSentence.includes(keyword)) {
          violations.push({
            type: rule.type,
            found: keyword,
            context: `"${trimmedSentence}"`,
            suggestion: rule.suggestion,
            severity: rule.severity
          })
        }
      })
    })
    
    // 외부 수상실적 체크
    rules.prohibitedItems.externalAwards.forEach(rule => {
      rule.keywords?.forEach(keyword => {
        if (trimmedSentence.includes(keyword)) {
          violations.push({
            type: rule.type,
            found: keyword,
            context: `"${trimmedSentence}"`,
            suggestion: rule.suggestion,
            severity: rule.severity
          })
        }
      })
    })
    
    // 논문/학회 관련 키워드 체크
    rules.prohibitedItems.academicKeywords.forEach(rule => {
      if (rule.keyword && trimmedSentence.includes(rule.keyword)) {
        violations.push({
          type: rule.type,
          found: rule.keyword,
          context: `"${trimmedSentence}"`,
          suggestion: rule.suggestion,
          severity: rule.severity
        })
      }
    })
    
    // '발표'는 논문/학회 발표가 아닌 일반 발표인지 확인
    if (trimmedSentence.includes('발표')) {
      const academicContext = rules.academicContextKeywords.some(keyword => 
        trimmedSentence.includes(keyword) || content.includes(keyword)
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
    
    // 부모/가족 정보 관련 키워드 체크
    rules.prohibitedItems.familyKeywords.forEach(rule => {
      if (rule.keyword && trimmedSentence.includes(rule.keyword)) {
        violations.push({
          type: rule.type,
          found: rule.keyword,
          context: `"${trimmedSentence}"`,
          suggestion: rule.suggestion,
          severity: rule.severity
        })
      }
    })
    
    // 1인칭 시점 체크
    rules.styleRules.firstPersonWords.forEach(rule => {
      rule.keywords?.forEach(keyword => {
        if (trimmedSentence.includes(keyword)) {
          violations.push({
            type: rule.type,
            found: keyword,
            context: `"${trimmedSentence}"`,
            suggestion: rule.suggestion,
            severity: rule.severity
          })
        }
      })
    })
    
    // 축약어 체크
    rules.styleRules.abbreviations.forEach(rule => {
      if (rule.keyword && trimmedSentence.includes(rule.keyword)) {
        violations.push({
          type: rule.type,
          found: rule.keyword,
          context: `"${trimmedSentence}"`,
          suggestion: rule.suggestion,
          severity: rule.severity
        })
      }
    })
    
    // 명사형 어미 체크
    rules.styleRules.wrongEndings.forEach(rule => {
      if (rule.keyword && trimmedSentence.includes(rule.keyword)) {
        violations.push({
          type: rule.type,
          found: rule.keyword,
          context: `"${trimmedSentence}"`,
          suggestion: rule.suggestion,
          severity: rule.severity
        })
      }
    })
    
    // 과도한 칭찬 표현 체크
    rules.styleRules.excessivePraise.forEach(rule => {
      rule.keywords?.forEach(keyword => {
        if (trimmedSentence.includes(keyword)) {
          violations.push({
            type: rule.type,
            found: keyword,
            context: `"${trimmedSentence}"`,
            suggestion: rule.suggestion,
            severity: rule.severity
          })
        }
      })
    })
  })
  
  return {
    isValid: violations.length === 0,
    violations
  }
}

// 학교생활기록부 검토 전용 프롬프트 생성
export function createSchoolRecordReviewPrompt(): string {
  return `당신은 학교생활기록부 기재 원칙 검토 전문가입니다.

**역할:**
선생님이 작성한 학교생활기록부 원문을 검토하고, 기재 원칙 위반 사항을 명확히 지적한 후 구체적인 개선안을 제시합니다.

**검토 순서:**

1️⃣ **원문 분석**
   - 제공된 원문을 문장별로 꼼꼼히 검토

2️⃣ **위반 사항 지적** (발견된 경우)
   각 위반 사항마다 다음 형식으로 명확히 표시:
   
   【문제 ①】 (위반 유형)
   - 원문 내용: "실제 문장 인용"
   - 문제점: 왜 이것이 기재 원칙에 위배되는지 설명
   - 수정 제안: 구체적인 개선 방향
   
3️⃣ **개선된 버전 제시**
   - 위반 사항을 수정한 개선안 전체 작성
   - 수정된 부분은 **굵게** 표시하여 변경사항을 명확히 함

**반드시 검토할 기재 금지 항목:**
- 공인어학성적 (토익, 토플, 텝스, HSK 등)
- 외부 수상실적 (교외 기관 수상)
- 논문/학회 발표
- 부모/가족 정보 (직업, 직장, 사회경제적 지위)
- 특정 대학명, 기관명, 영어 브랜드명 (ChatGPT, Gemini 등 → '생성형 AI', '대화형 모델'로 대체)
- 1인칭 시점 ('저는', '제가')
- 학생 시점 표현 (~을 깨달음, ~을 알게 됨, ~라고 느낀, 계기가 되었음, ~다짐함)
- 축약어 ('생기부', '세특' 등 → '학교생활기록부', '세부능력 및 특기사항')
- 잘못된 어미 (~했다, ~습니다 대신 ~함, ~임 사용)
- 금지 기호 (마크다운 문법, 특수기호 《》『』「」〈〉·)

**검토 결과 형식:**

## 📋 원문 검토 결과

### ✅ 준수된 사항
- (잘 작성된 부분 구체적으로 칭찬)

### ⚠️ 수정이 필요한 사항

【문제 ①】 (위반 유형)
- 원문: "(실제 문장 인용)"
- 문제점: (상세 설명)
- 수정 제안: (구체적 방향)

(필요한 만큼 반복)

### ✨ 개선안

(수정된 전체 내용 작성. 수정 부분은 **굵게** 표시)

---

**만약 위반 사항이 전혀 없다면:**

## ✅ 검토 결과: 기재 원칙 준수

제공하신 내용은 학교생활기록부 기재 원칙을 잘 준수하고 있습니다.

**잘된 점:**
- (구체적으로 잘된 점 나열)

**선택적 개선 제안:**
- (더 나은 표현이나 추가할 내용 제안)
`
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
export function createOptimizedSchoolRecordPrompt(
  messages: any[], 
  isContinuation: boolean = false, 
  category: 'subject-detail' | 'activity' | 'behavior' | null = null,
  options?: { subject?: string; level?: string },
  mode: 'create' | 'review' = 'create' // 작성 모드 vs 검토 모드
): string {
  // 검토 모드인 경우 검토 전용 프롬프트 반환
  if (mode === 'review') {
    return createSchoolRecordReviewPrompt()
  }

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
  const relevantGuidelines = extractRelevantGuidelines(lastUserMessage, category, options)

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
function extractRelevantGuidelines(
  userMessage: string, 
  category: 'subject-detail' | 'activity' | 'behavior' | null = null,
  options?: { subject?: string; level?: string }
): string {
  const guidelines = loadSchoolRecordGuidelines()
  const lowerMessage = userMessage.toLowerCase()
  
  // 역할 섹션을 교과명으로 치환
  let processedGuidelines = guidelines
  if (options?.subject) {
    processedGuidelines = processedGuidelines.replace('[교과명]', options.subject)
  }
  
  // 역할(Role) 섹션 추출
  const roleStart = processedGuidelines.indexOf('## 역할 (Role)')
  const roleEnd = processedGuidelines.indexOf('## I. 공통 기재 원칙')
  const roleSection = roleStart !== -1 && roleEnd !== -1
    ? processedGuidelines.substring(roleStart, roleEnd).trim()
    : ''
  
  // 카테고리별 섹션 추출
  if (category) {
    let sectionTitle = ''
    switch (category) {
      case 'subject-detail':
        sectionTitle = '### A. 교과 세부능력 및 특기사항 (세특)'
        break
      case 'activity':
        sectionTitle = '### B. 창의적 체험활동 특기사항 (자율, 진로, 동아리)'
        break
      case 'behavior':
        sectionTitle = '### C. 행동특성 및 종합의견 (행특)'
        break
    }

    if (sectionTitle) {
      const sectionStart = processedGuidelines.indexOf(sectionTitle)
      if (sectionStart !== -1) {
        // 다음 ### 섹션까지 추출 (D섹션 전까지)
        let nextSectionStart = processedGuidelines.indexOf('### D.', sectionStart + 1)
        if (nextSectionStart === -1) {
          nextSectionStart = processedGuidelines.indexOf('## V.', sectionStart + 1)
        }
        const sectionEnd = nextSectionStart !== -1 ? nextSectionStart : processedGuidelines.length
        let categorySection = processedGuidelines.substring(sectionStart, sectionEnd).trim()

        // 교과세특인 경우 수준에 따라 필터링
        if (category === 'subject-detail' && options?.level) {
          const levelMap: { [key: string]: string } = {
            'advanced': '🥇 상급 수준',
            'intermediate': '🥈 중급 수준',
            'basic': '🥉 기본 수준'
          }
          const levelName = levelMap[options.level]
          
          if (levelName) {
            // 선택된 수준만 남기고 다른 수준 섹션 제거
            const levelMarkers = ['🥇 상급 수준', '🥈 중급 수준', '🥉 기본 수준']
            
            // 선택된 수준의 시작 위치 찾기
            const selectedLevelStart = categorySection.indexOf(levelName)
            
            if (selectedLevelStart !== -1) {
              // 다음 수준 마커의 위치 찾기 (선택된 수준의 끝)
              let selectedLevelEnd = categorySection.length
              for (const marker of levelMarkers) {
                if (marker !== levelName) {
                  const markerPos = categorySection.indexOf(marker, selectedLevelStart + levelName.length)
                  if (markerPos !== -1 && markerPos < selectedLevelEnd) {
                    selectedLevelEnd = markerPos
                  }
                }
              }
              
              // 선택된 수준 섹션만 추출
              const selectedLevelSection = categorySection.substring(selectedLevelStart, selectedLevelEnd).trim()
              
              // 수준별 작성 전략 헤더 이전 부분 (공통 설명)
              const commonSectionEnd = categorySection.indexOf('#### 수준별 작성 전략')
              const commonSection = commonSectionEnd !== -1 
                ? categorySection.substring(0, commonSectionEnd).trim() 
                : categorySection.substring(0, categorySection.indexOf('**🥇 상급 수준')).trim()
              
              // 우수 작성 사례 섹션 (모든 수준에 공통으로 필요할 수 있음)
              const exampleStart = categorySection.indexOf('#### 우수 작성 사례')
              const exampleSection = exampleStart !== -1 
                ? '\n\n' + categorySection.substring(exampleStart).trim() 
                : ''
              
              // 재조합: 공통 설명 + 선택된 수준 + 예시
              categorySection = `${commonSection}\n\n#### 작성 수준\n${selectedLevelSection}${exampleSection}\n\n**현재 작성 수준: ${levelName}**\n작성 시 위의 ${levelName} 전략과 구조를 따라 작성해주세요.`
            }
          }
        }

        // 핵심역량 정보도 추가
        const competencyStart = processedGuidelines.indexOf('## III. 2022 개정 교육과정 핵심역량 및 필수 서술어')
        const competencyEnd = processedGuidelines.indexOf('## IV. 항목별 핵심 기재 요령')
        const competencySection = competencyStart !== -1 && competencyEnd !== -1 
          ? processedGuidelines.substring(competencyStart, competencyEnd).trim() 
          : ''

        // 역할 섹션을 맨 앞에 포함
        return `${roleSection}\n\n${categorySection}\n\n${competencySection}\n\n## 공통 기재 원칙:\n- 객관성: 교사가 직접 관찰한 사실 기반\n- 과정 중심: 동기, 과정, 성장, 변화 중심\n- 구체성: 구체적 사례와 근거 제시\n- 개별화: 학생 고유 특성 표현\n- 자기주도성: 학생 주도적 역할과 노력 부각\n- 교사 관찰 시점 유지: 학생의 주관적 감정이나 깨달음 절대 표현 금지`
      }
    }
  }
  
  // 키워드별 관련 섹션 매핑 (카테고리가 선택되지 않은 경우)
  const sectionMap = {
    '세특': '### A. 교과 세부능력 및 특기사항 (세특)',
    '세부능력': '### A. 교과 세부능력 및 특기사항 (세특)',
    '특기사항': '### A. 교과 세부능력 및 특기사항 (세특)',
    '교과': '### A. 교과 세부능력 및 특기사항 (세특)',
    '동아리': '### B. 창의적 체험활동 특기사항 (자율, 진로, 동아리)',
    '자율활동': '### B. 창의적 체험활동 특기사항 (자율, 진로, 동아리)',
    '창의적': '### B. 창의적 체험활동 특기사항 (자율, 진로, 동아리)',
    '체험활동': '### B. 창의적 체험활동 특기사항 (자율, 진로, 동아리)',
    '진로': '### B. 창의적 체험활동 특기사항 (자율, 진로, 동아리)',
    '독서': '### D. 기타 항목별 기재 요령',
    '행동특성': '### C. 행동특성 및 종합의견 (행특)',
    '종합의견': '### C. 행동특성 및 종합의견 (행특)',
    '행특': '### C. 행동특성 및 종합의견 (행특)'
  }

  // 관련 섹션 찾기
  const relevantSections = []
  for (const [keyword, section] of Object.entries(sectionMap)) {
    if (lowerMessage.includes(keyword)) {
      const sectionStart = guidelines.indexOf(section)
      if (sectionStart !== -1) {
        let nextSectionStart = guidelines.indexOf('###', sectionStart + section.length)
        if (section.includes('### A.') || section.includes('### B.') || section.includes('### C.')) {
          // A, B, C 섹션의 경우 다음 ###가 나올 때까지
          const possibleEnds = [
            guidelines.indexOf('### D.', sectionStart + 1),
            guidelines.indexOf('## V.', sectionStart + 1)
          ].filter(idx => idx !== -1)
          nextSectionStart = possibleEnds.length > 0 ? Math.min(...possibleEnds) : guidelines.length
        }
        const sectionEnd = nextSectionStart !== -1 ? nextSectionStart : guidelines.length
        relevantSections.push(guidelines.substring(sectionStart, sectionEnd).trim())
        break // 첫 번째 매칭된 섹션만 사용
      }
    }
  }

  // 관련 섹션이 있으면 해당 섹션만, 없으면 핵심 원칙만 반환
  if (relevantSections.length > 0) {
    return `## 관련 기재 원칙:\n${relevantSections.join('\n\n')}\n\n## 공통 기재 원칙:\n- 객관성: 교사가 직접 관찰한 사실 기반\n- 과정 중심: 동기, 과정, 성장, 변화 중심\n- 구체성: 구체적 사례와 근거 제시\n- 개별화: 학생 고유 특성 표현\n- 자기주도성: 학생 주도적 역할과 노력 부각\n- 교사 관찰 시점 유지: 학생의 주관적 감정이나 깨달음 절대 표현 금지`
  }

  // 기본 핵심 원칙만 반환 (토큰 대폭 절약)
  return `## 핵심 기재 원칙:
- 객관성: 교사가 직접 관찰한 사실에 근거
- 과정 중심: 결과보다 동기, 과정, 성장, 변화 중심
- 구체성: 추상적 표현 지양, 구체적 사례와 근거 제시
- 개별화: 학생 고유의 특성과 역량 표현
- 자기주도성: 학생이 주도한 역할, 노력, 탐구과정 부각
- 교사 관찰 시점 유지: 학생의 주관적 감정이나 깨달음 절대 표현 금지

## 주요 금지사항:
- 공인어학성적 (토익, 토플, 텝스, HSK 등)
- 외부 수상실적 (교외 기관 수상)
- 논문/학회 발표 관련 내용
- 부모/가족 정보 (직업, 직장, 사회경제적 지위)
- 특정 대학명, 기관명 언급
- 1인칭 시점 ('저는', '제가' 등)
- 학생 시점 표현 (~을 깨달음, ~을 알게 됨, ~라고 느낌, 계기가 되었음, ~다짐함)
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
