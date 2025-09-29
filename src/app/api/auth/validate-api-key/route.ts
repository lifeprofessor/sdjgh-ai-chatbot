import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { validateApiKey, maskApiKey } from '@/lib/api-key-utils'

export async function POST() {
  try {
    const session = getSession()

    if (!session) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    if (!session.api_key) {
      return NextResponse.json(
        { 
          isValid: false, 
          error: '사용자에게 할당된 API 키가 없습니다.',
          user: session.name
        },
        { status: 403 }
      )
    }

    // API 키 유효성 검증
    const validation = await validateApiKey(session.api_key)

    if (validation.isValid) {
      return NextResponse.json(
        {
          isValid: true,
          message: 'API 키가 유효합니다.',
          user: session.name,
          api_key: maskApiKey(session.api_key)
        },
        { status: 200 }
      )
    } else {
      return NextResponse.json(
        {
          isValid: false,
          error: validation.error,
          user: session.name,
          api_key: maskApiKey(session.api_key)
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('API 키 검증 중 오류:', error)
    return NextResponse.json(
      { 
        isValid: false,
        error: 'API 키 검증 중 서버 오류가 발생했습니다.' 
      },
      { status: 500 }
    )
  }
}
