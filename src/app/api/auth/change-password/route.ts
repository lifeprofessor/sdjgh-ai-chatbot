import { NextRequest, NextResponse } from 'next/server'
import { changePassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { username, currentPassword, newPassword } = await request.json()

    // 입력 검증
    if (!username || !currentPassword || !newPassword) {
      return NextResponse.json(
        { message: '모든 필드를 입력해주세요.' },
        { status: 400 }
      )
    }

    // 새 비밀번호 길이 검증
    if (newPassword.length < 6) {
      return NextResponse.json(
        { message: '새 비밀번호는 최소 6자 이상이어야 합니다.' },
        { status: 400 }
      )
    }

    // 현재 비밀번호와 새 비밀번호 동일한지 검증
    if (currentPassword === newPassword) {
      return NextResponse.json(
        { message: '현재 비밀번호와 새 비밀번호가 동일합니다.' },
        { status: 400 }
      )
    }

    // 비밀번호 변경 실행
    const result = await changePassword(username, currentPassword, newPassword)

    if (result.success) {
      return NextResponse.json(
        { message: result.message },
        { status: 200 }
      )
    } else {
      return NextResponse.json(
        { message: result.message },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('비밀번호 변경 API 오류:', error)
    return NextResponse.json(
      { message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
