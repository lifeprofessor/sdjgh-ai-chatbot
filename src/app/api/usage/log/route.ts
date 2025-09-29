import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { logApiUsage } from '@/lib/api-key-utils'

// 동적 라우트로 설정
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = getSession()

    if (!session) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const { tokensUsed, model, requestType } = await request.json()

    if (!tokensUsed || !model) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // API 사용량 로깅
    logApiUsage(session.id, session.name, tokensUsed, model)

    // 추가적으로 데이터베이스에 기록하는 로직을 여기에 추가할 수 있습니다
    // 예: Supabase에 usage_logs 테이블에 저장

    return NextResponse.json(
      { 
        message: '사용량이 기록되었습니다.',
        user: session.name,
        tokensUsed,
        model
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('사용량 로깅 중 오류:', error)
    return NextResponse.json(
      { error: '사용량 로깅 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
