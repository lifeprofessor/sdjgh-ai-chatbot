import { NextResponse } from 'next/server'
import { deleteSession } from '@/lib/session'

// 동적 라우트로 설정
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    // 세션 삭제
    deleteSession()

    return NextResponse.json(
      { message: '로그아웃 성공' },
      { status: 200 }
    )
  } catch (error) {
    console.error('로그아웃 API 오류:', error)
    return NextResponse.json(
      { message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
