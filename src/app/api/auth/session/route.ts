import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { maskApiKey } from '@/lib/api-key-utils'

export async function GET() {
  try {
    const session = getSession()

    if (!session) {
      return NextResponse.json(
        { message: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      )
    }

    // API 키 유효성 기본 체크
    if (!session.api_key || !session.api_key.startsWith('sk-ant-')) {
      return NextResponse.json(
        { message: '유효하지 않은 API 키입니다.' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { 
        message: '세션 확인 성공',
        user: {
          ...session,
          api_key: maskApiKey(session.api_key) // 보안을 위해 마스킹된 API 키 반환
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('세션 확인 API 오류:', error)
    return NextResponse.json(
      { message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
