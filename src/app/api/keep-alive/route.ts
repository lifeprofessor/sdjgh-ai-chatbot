import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/auth'

// 동적 라우트로 설정
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // 보안을 위한 간단한 시크릿 체크
    const keepAliveSecret = request.headers.get('X-Keep-Alive-Secret')
    const expectedSecret = process.env.KEEP_ALIVE_SECRET
    
    if (!expectedSecret || keepAliveSecret !== expectedSecret) {
      return NextResponse.json(
        { error: '인증되지 않은 요청입니다.' },
        { status: 401 }
      )
    }

    // Supabase 연결 테스트 (실제 로그인으로 테스트)
    console.log('🔄 Keep-alive: test 계정으로 로그인 테스트 시작...')
    
    const testUser = await authenticateUser('test', '1234')
    
    if (!testUser) {
      console.error('Keep-alive 실패: test 계정 로그인 실패')
      return NextResponse.json(
        { error: 'Supabase 연결 실패: 테스트 로그인 불가' },
        { status: 500 }
      )
    }

    console.log('✅ Keep-alive 성공:', {
      timestamp: new Date().toISOString(),
      userId: testUser.id,
      userName: testUser.name
    })
    
    return NextResponse.json({
      success: true,
      message: 'Supabase 연결 활성화 완료 (로그인 테스트 성공)',
      timestamp: new Date().toISOString(),
      testUser: {
        id: testUser.id,
        name: testUser.name
      }
    })

  } catch (error) {
    console.error('Keep-alive 중 오류:', error)
    return NextResponse.json(
      { error: 'Keep-alive 처리 중 오류 발생' },
      { status: 500 }
    )
  }
}
