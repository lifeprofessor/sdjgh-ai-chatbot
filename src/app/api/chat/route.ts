import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createSchoolRecordSystemPrompt, validateSchoolRecord } from '@/utils/school-record-utils'
import { getSession } from '@/lib/session'

// 동적 라우트로 설정
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // 세션 확인
    const session = getSession()
    if (!session) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    // 사용자의 API 키 확인
    if (!session.api_key) {
      return NextResponse.json(
        { error: '사용자에게 할당된 API 키가 없습니다.' },
        { status: 403 }
      )
    }

    // 사용자별 Anthropic 클라이언트 생성
    const anthropic = new Anthropic({
      apiKey: session.api_key,
    })

    const { messages, mode } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: '유효하지 않은 메시지 형식입니다.' },
        { status: 400 }
      )
    }

    // 연속 요청인지 확인 (마지막 메시지가 "계속 작성" 관련인지)
    const lastMessage = messages[messages.length - 1]
    const isContinuation = lastMessage && 
      lastMessage.role === 'user' && 
      (lastMessage.content.includes('계속 작성') || lastMessage.content.includes('이어서'))

    // 명시적으로 전달된 모드 확인
    const isSchoolRecordRequest = mode === 'school-record'

    // 학교생활기록부 요청인 경우 시스템 프롬프트 추가
    let processedMessages = [...messages]
    if (isSchoolRecordRequest) {
      const systemPrompt = createSchoolRecordSystemPrompt()
      processedMessages = [
        { role: 'system', content: systemPrompt },
        ...messages
      ]
      console.log('📋 학교생활기록부 전용 시스템 프롬프트 적용됨 (모드:', mode, ')')
    }

    // 연속 요청일 때는 토큰 수를 더 줄임
    const maxTokens = isContinuation ? 800 : 1500
    
    console.log('📨 Claude API 요청 시작:', {
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      message_count: messages.length,
      user: session.name,
      user_id: session.id,
      isContinuation: isContinuation
    })

    // 전체 응답을 수집하여 한 번에 반환
    let fullResponse = ''
    let totalTokens = 0
    let chunkCount = 0
    let isComplete = false

    try {
      // 8초 타임아웃 설정 (Vercel 10초 제한보다 2초 여유)
      const abortController = new AbortController()
      const timeoutId = setTimeout(() => {
        console.warn('⏰ 8초 타임아웃 도달, 응답 중단')
        abortController.abort()
      }, 8000)

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens, // 연속 요청 시 더 적은 토큰 사용
        messages: processedMessages.map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : (msg.role === 'system' ? 'user' : 'assistant'),
          content: msg.role === 'system' ? `[시스템 지침]\n${msg.content}` : msg.content
        })),
        stream: true
      }, {
        signal: abortController.signal
      })

      console.log('✅ Claude API 응답 스트림 시작')

      // 모든 청크를 수집
      for await (const chunk of response) {
        chunkCount++
        
        if (chunk.type === 'content_block_start') {
          console.log('📝 콘텐츠 블록 시작')
        } else if (chunk.type === 'content_block_delta') {
          if ('text' in chunk.delta) {
            totalTokens += chunk.delta.text.length
            fullResponse += chunk.delta.text
            console.log(`📤 청크 ${chunkCount}: "${chunk.delta.text}" (길이: ${chunk.delta.text.length})`)
          }
        } else if (chunk.type === 'content_block_stop') {
          console.log('📝 콘텐츠 블록 완료')
        } else if (chunk.type === 'message_stop') {
          console.log('🏁 메시지 완료')
          isComplete = true
        }
      }

      clearTimeout(timeoutId)
      console.log(`✅ 응답 수집 완료! 총 청크: ${chunkCount}, 총 문자 수: ${totalTokens}, 완료 여부: ${isComplete}`)

      // 학교생활기록부 요청인 경우 응답 검증
      let validationResult = null
      if (isSchoolRecordRequest && fullResponse) {
        const validation = validateSchoolRecord(fullResponse)
        if (!validation.isValid) {
          console.warn('⚠️ 학교생활기록부 기재 원칙 위반 사항:', validation.violations)
          validationResult = {
            warning: '기재 원칙 검토 필요',
            violations: validation.violations
          }
        } else {
          console.log('✅ 학교생활기록부 기재 원칙 준수 확인됨')
        }
      }

      

      // 한 번에 응답 반환
      return NextResponse.json({
        content: fullResponse,
        isComplete: isComplete,
        validation: validationResult,
        metadata: {
          chunks: chunkCount,
          characters: totalTokens,
          model: 'claude-sonnet-4-20250514',
          maxTokens: maxTokens,
          timeout: false, // 정상 완료된 경우 timeout: false
          isContinuation: isContinuation
        }
      })

    } catch (error: any) {
      console.error('❌ Claude API Error:', {
        message: error.message,
        status: error.status,
        type: error.type,
        error_type: error.error?.type,
        details: error.error
      })
      
      let errorMessage = 'AI 응답을 생성하는 중 오류가 발생했습니다.'
      
      // 타임아웃 및 중단 에러 처리
      if (error.name === 'TimeoutError' || error.code === 'TIMEOUT' || error.name === 'AbortError') {
        // 부분 응답이라도 있으면 반환
        if (fullResponse.length > 0) {
          console.warn('⏰ 타임아웃 발생했지만 부분 응답 반환', {
            contentLength: fullResponse.length,
            chunks: chunkCount
          })
          return NextResponse.json({
            content: fullResponse + '\n\n[응답이 시간 제한으로 인해 중단되었습니다.]',
            isComplete: false,
            validation: null,
            metadata: {
              chunks: chunkCount,
              characters: totalTokens,
              model: 'claude-sonnet-4-20250514',
              maxTokens: maxTokens,
              timeout: true, // 타임아웃 플래그 명시적 설정
              isContinuation: isContinuation
            }
          })
        }
        
        errorMessage = '응답 시간이 초과되었습니다. 더 짧고 구체적인 질문으로 다시 시도해주세요.'
        console.warn('⏰ API 타임아웃 또는 중단 발생')
      }
      
      // API 키 관련 에러
      else if (error.status === 401) {
        errorMessage = `사용자 ${session.name}의 API 키가 유효하지 않거나 만료되었습니다. 관리자에게 문의하세요.`
        console.error('🔑 API 키 오류:', {
          user: session.name,
          user_id: session.id,
          api_key_prefix: session.api_key.substring(0, 10) + '...'
        })
      }
      
      // 사용량 제한 에러
      else if (error.status === 429) {
        errorMessage = 'API 사용량 한도를 초과했습니다. 잠시 후 다시 시도해주세요.'
        console.warn('⏱️ 사용량 제한 도달')
      }
      
      // 서버 에러
      else if (error.status >= 500) {
        errorMessage = 'AI 서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'
        console.error('🔥 서버 에러')
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: error.status || 500 }
      )
    }

  } catch (error: any) {
    console.error('❌ Request Processing Error:', {
      message: error.message,
      status: error.status,
      type: error.type,
      stack: error.stack
    })
    
    if (error.status === 401) {
      const session = getSession()
      const userInfo = session ? ` (사용자: ${session.name})` : ''
      return NextResponse.json(
        { error: `API 키가 유효하지 않습니다${userInfo}.` },
        { status: 401 }
      )
    } else if (error.status === 429) {
      return NextResponse.json(
        { error: 'API 사용량 한도를 초과했습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      )
    } else if (error.status === 400) {
      return NextResponse.json(
        { error: '요청이 올바르지 않습니다. 다시 시도해주세요.' },
        { status: 400 }
      )
    } else {
      return NextResponse.json(
        { error: 'AI 응답을 생성하는 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }
  }
}
