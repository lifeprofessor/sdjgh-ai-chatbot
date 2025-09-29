import { NextResponse } from 'next/server'
import { deleteSession } from '@/lib/session'

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
