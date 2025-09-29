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

// 학교생활기록부 작성을 위한 시스템 프롬프트 생성
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
