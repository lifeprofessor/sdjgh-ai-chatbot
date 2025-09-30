import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createSchoolRecordSystemPrompt, validateSchoolRecord, createOptimizedSchoolRecordPrompt, optimizeMessageContext, estimateTokens } from '@/utils/school-record-utils'
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

    // 컨텍스트 윈도우 최적화
    const optimizedMessages = optimizeMessageContext(messages, isSchoolRecordRequest, isContinuation)
    
    // 학교생활기록부 요청인 경우 시스템 프롬프트 추가
    let processedMessages = [...optimizedMessages]
    if (isSchoolRecordRequest) {
      const systemPrompt = createOptimizedSchoolRecordPrompt(messages, isContinuation)
      processedMessages = [
        { role: 'system', content: systemPrompt },
        ...optimizedMessages
      ]
      console.log('📋 최적화된 학교생활기록부 프롬프트 적용됨 (모드:', mode, ', 연속:', isContinuation, ')')
    }

    // 58초 타임아웃에 맞춰 토큰 수 증가 (연속 요청일 때는 상대적으로 적게)
    const maxTokens = isContinuation ? 2000 : 4000
    
    // 토큰 사용량 추정
    const estimatedInputTokens = estimateTokens(processedMessages)
    
    console.log('📨 Claude API 요청 시작:', {
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      message_count: processedMessages.length,
      estimated_input_tokens: estimatedInputTokens,
      user: session.name,
      user_id: session.id,
      isContinuation: isContinuation,
      optimization_applied: true
    })

    // 전체 응답을 수집하여 한 번에 반환
    let fullResponse = ''
    let totalTokens = 0
    let chunkCount = 0
    let isComplete = false

    try {
      // 58초 타임아웃 설정 (Vercel 60초 제한보다 2초 여유)
      const abortController = new AbortController()
      const timeoutId = setTimeout(() => {
        console.warn('⏰ 58초 타임아웃 도달, 응답 중단')
        abortController.abort()
      }, 58000)

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

      // 스트리밍 응답을 위한 ReadableStream 생성
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of response) {
              chunkCount++
              
              if (chunk.type === 'content_block_start') {
                console.log('📝 콘텐츠 블록 시작')
              } else if (chunk.type === 'content_block_delta') {
                if ('text' in chunk.delta) {
                  totalTokens += chunk.delta.text.length
                  fullResponse += chunk.delta.text
                  
                  // 클라이언트에게 실시간으로 청크 전송
                  const chunkData = {
                    type: 'chunk',
                    content: chunk.delta.text,
                    chunkCount: chunkCount
                  }
                  controller.enqueue(`data: ${JSON.stringify(chunkData)}\n\n`)
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
            
            // 완료 신호 전송 (검증 결과 포함)
            const completeData = {
              type: 'complete',
              isComplete: isComplete,
              totalChunks: chunkCount,
              totalTokens: totalTokens,
              fullResponse: fullResponse,
              validation: validationResult,
              metadata: {
                chunks: chunkCount,
                characters: totalTokens,
                model: 'claude-sonnet-4-20250514',
                maxTokens: maxTokens,
                timeout: false,
                isContinuation: isContinuation,
                estimatedInputTokens: estimatedInputTokens,
                optimizationApplied: true,
                originalMessageCount: messages.length,
                optimizedMessageCount: optimizedMessages.length
              }
            }
            controller.enqueue(`data: ${JSON.stringify(completeData)}\n\n`)
            controller.close()
            
          } catch (error) {
            console.error('스트리밍 중 오류:', error)
            const errorData = {
              type: 'error',
              error: error instanceof Error ? error.message : '스트리밍 오류'
            }
            controller.enqueue(`data: ${JSON.stringify(errorData)}\n\n`)
            controller.close()
          }
        }
      })

      // Server-Sent Events 응답 반환
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
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
        errorMessage = '응답 시간이 60초를 초과했습니다. 더 짧고 구체적인 질문으로 다시 시도해주세요.'
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
      
      // 스트리밍 에러 응답 반환
      const errorStream = new ReadableStream({
        start(controller) {
          const errorData = {
            type: 'error',
            error: errorMessage
          }
          controller.enqueue(`data: ${JSON.stringify(errorData)}\n\n`)
          controller.close()
        }
      })
      
      return new Response(errorStream, {
        status: error.status || 500,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

  } catch (error: any) {
    console.error('❌ Request Processing Error:', {
      message: error.message,
      status: error.status,
      type: error.type,
      stack: error.stack
    })
    
    let errorMessage = 'AI 응답을 생성하는 중 오류가 발생했습니다.'
    let statusCode = 500
    
    if (error.status === 401) {
      const session = getSession()
      const userInfo = session ? ` (사용자: ${session.name})` : ''
      errorMessage = `API 키가 유효하지 않습니다${userInfo}.`
      statusCode = 401
    } else if (error.status === 429) {
      errorMessage = 'API 사용량 한도를 초과했습니다. 잠시 후 다시 시도해주세요.'
      statusCode = 429
    } else if (error.status === 400) {
      errorMessage = '요청이 올바르지 않습니다. 다시 시도해주세요.'
      statusCode = 400
    }
    
    // 스트리밍 에러 응답 반환
    const errorStream = new ReadableStream({
      start(controller) {
        const errorData = {
          type: 'error',
          error: errorMessage
        }
        controller.enqueue(`data: ${JSON.stringify(errorData)}\n\n`)
        controller.close()
      }
    })
    
    return new Response(errorStream, {
      status: statusCode,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  }
}
