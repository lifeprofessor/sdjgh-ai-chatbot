import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/auth'
import { createSession } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const { name, password } = await request.json()

    // 입력 검증
    if (!name || !password) {
      return NextResponse.json(
        { message: '사용자명과 비밀번호를 입력해주세요.' },
        { status: 400 }
      )
    }

    // 사용자 인증
    const user = await authenticateUser(name, password)
    
    if (!user) {
      return NextResponse.json(
        { message: '사용자명 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      )
    }

    // 세션 생성
    createSession(user)

    return NextResponse.json(
      { 
        message: '로그인 성공',
        user: {
          id: user.id,
          name: user.name,
          api_key: user.api_key
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('로그인 API 오류:', error)
    return NextResponse.json(
      { message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
