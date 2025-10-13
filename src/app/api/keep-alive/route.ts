import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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

    // Supabase 연결 테스트 (간단한 쿼리)
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1)

    if (error) {
      console.error('Keep-alive 실패:', error)
      return NextResponse.json(
        { error: 'Supabase 연결 실패', details: error.message },
        { status: 500 }
      )
    }

    console.log('✅ Keep-alive 성공:', new Date().toISOString())
    
    return NextResponse.json({
      success: true,
      message: 'Supabase 연결 활성화 완료',
      timestamp: new Date().toISOString(),
      userCount: data?.length || 0
    })

  } catch (error) {
    console.error('Keep-alive 중 오류:', error)
    return NextResponse.json(
      { error: 'Keep-alive 처리 중 오류 발생' },
      { status: 500 }
    )
  }
}
