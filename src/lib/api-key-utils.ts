import Anthropic from '@anthropic-ai/sdk'

/**
 * API 키 유효성을 검증하는 함수
 */
export async function validateApiKey(apiKey: string): Promise<{ isValid: boolean; error?: string }> {
  try {
    if (!apiKey || apiKey.trim() === '') {
      return { isValid: false, error: 'API 키가 제공되지 않았습니다.' }
    }

    // API 키 형식 검증 (Anthropic API 키는 'sk-ant-'로 시작)
    if (!apiKey.startsWith('sk-ant-')) {
      return { isValid: false, error: 'Anthropic API 키 형식이 올바르지 않습니다.' }
    }

    // 간단한 API 호출로 키 유효성 검증
    const anthropic = new Anthropic({ apiKey })
    
    // 최소한의 요청으로 API 키 유효성 확인
    await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Hi' }],
    })

    return { isValid: true }
  } catch (error: any) {
    console.error('API 키 검증 실패:', error)
    
    if (error.status === 401) {
      return { isValid: false, error: 'API 키가 유효하지 않거나 만료되었습니다.' }
    } else if (error.status === 429) {
      return { isValid: false, error: 'API 사용량 한도를 초과했습니다.' }
    } else if (error.status === 403) {
      return { isValid: false, error: 'API 키에 필요한 권한이 없습니다.' }
    }
    
    return { isValid: false, error: 'API 키 검증 중 오류가 발생했습니다.' }
  }
}

/**
 * 사용자별 API 사용량을 로깅하는 함수
 */
export function logApiUsage(userId: number, userName: string, tokensUsed: number, model: string) {
  console.log('📊 API 사용량 기록:', {
    timestamp: new Date().toISOString(),
    userId,
    userName,
    tokensUsed,
    model,
  })
  
  // 여기에 데이터베이스에 사용량을 저장하는 로직을 추가할 수 있습니다.
  // 예: Supabase에 api_usage 테이블에 기록
}

/**
 * API 키를 안전하게 마스킹하는 함수
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 10) {
    return '***'
  }
  return apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 4)
}
