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

    // 스트리밍 응답을 위한 ReadableStream 생성
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Claude API 스트리밍 호출
          console.log('📨 Claude API 요청 시작:', {
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4000,
            message_count: messages.length,
            user: session.name,
            user_id: session.id
          })
          
          // 타임아웃을 위한 AbortController 사용
          const abortController = new AbortController()
          const timeoutId = setTimeout(() => {
            abortController.abort()
          }, 8000) // 8초 타임아웃

          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2000, // 토큰 수 줄여서 응답 시간 단축
            messages: processedMessages.map((msg: any) => ({
              role: msg.role === 'user' ? 'user' : (msg.role === 'system' ? 'user' : 'assistant'),
              content: msg.role === 'system' ? `[시스템 지침]\n${msg.content}` : msg.content
            })),
            stream: true
          }, {
            signal: abortController.signal // AbortController 신호 전달
          })

          // 타임아웃 클리어
          clearTimeout(timeoutId)
          
          console.log('✅ Claude API 응답 스트림 시작')

          // 스트리밍 응답 처리
          let totalTokens = 0
          let chunkCount = 0
          let fullResponse = '' // 전체 응답 수집 (검증용)
          
          for await (const chunk of response) {
            chunkCount++
            
            if (chunk.type === 'content_block_start') {
              console.log('📝 콘텐츠 블록 시작')
            } else if (chunk.type === 'content_block_delta') {
              if ('text' in chunk.delta) {
                totalTokens += chunk.delta.text.length // 대략적인 토큰 수
                fullResponse += chunk.delta.text // 전체 응답에 추가
                console.log(`📤 청크 ${chunkCount}: "${chunk.delta.text.slice(0, 50)}${chunk.delta.text.length > 50 ? '...' : ''}" (길이: ${chunk.delta.text.length})`)
                
                const data = JSON.stringify({ content: chunk.delta.text })
                controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`))
              }
            } else if (chunk.type === 'content_block_stop') {
              console.log('📝 콘텐츠 블록 완료')
            } else if (chunk.type === 'message_stop') {
              console.log('🏁 메시지 완료')
              
              // 학교생활기록부 요청인 경우 응답 검증
              if (isSchoolRecordRequest && fullResponse) {
                const validation = validateSchoolRecord(fullResponse)
                if (!validation.isValid) {
                  console.warn('⚠️ 학교생활기록부 기재 원칙 위반 사항:', validation.violations)
                  // 위반 사항을 클라이언트에 알림 (선택사항)
                  const warningData = JSON.stringify({ 
                    warning: '기재 원칙 검토 필요', 
                    violations: validation.violations 
                  })
                  controller.enqueue(new TextEncoder().encode(`data: ${warningData}\n\n`))
                } else {
                  console.log('✅ 학교생활기록부 기재 원칙 준수 확인됨')
                }
              }
            }
          }

          console.log(`✅ 스트리밍 완료! 총 청크: ${chunkCount}, 총 문자 수: ${totalTokens}`)
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
          controller.close()
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
            errorMessage = '응답 시간이 초과되었습니다. 더 짧은 질문으로 다시 시도해주세요.'
            console.warn('⏰ API 타임아웃 또는 중단 발생')
          }
          
          // 토큰 제한 관련 에러
          if (error.status === 400 && error.error?.type === 'invalid_request_error') {
            if (error.error.message?.includes('max_tokens')) {
              errorMessage = '응답이 너무 길어 중단되었습니다. 더 짧은 질문으로 시도해보세요.'
              console.warn('⚠️ 토큰 제한 도달')
            }
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
          
          const errorData = JSON.stringify({ error: errorMessage })
          controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

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
