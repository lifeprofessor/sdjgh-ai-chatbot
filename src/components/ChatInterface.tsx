'use client'

import { useState, useRef, useEffect } from 'react'
import MessageList from '@/components/MessageList'
import InputArea from '@/components/InputArea'
import Image from 'next/image'

export interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  isStreaming?: boolean
  attachedFiles?: UploadedFile[]
  validation?: {
    warning?: string
    violations?: Array<{
      type: string
      found: string
      context: string
      suggestion: string
      severity: 'critical' | 'warning' | 'minor'
    }>
    isOriginalContent?: boolean
  }
  isComplete?: boolean
  canContinue?: boolean
  mode?: 'general' | 'school-record' // 메시지에 모드 정보 저장
  category?: 'subject-detail' | 'activity' | 'behavior' | null // 카테고리 정보 저장
  options?: {
    subject?: string
    level?: string
  }
  metadata?: {
    chunks: number
    characters: number
    model: string
    maxTokens: number
    timeout?: boolean
    estimatedInputTokens?: number
    optimizationApplied?: boolean
    originalMessageCount?: number
    optimizedMessageCount?: number
    isContinuation?: boolean
  }
}

export interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  content: string
  uploadedAt: Date
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isAutoScrolling, setIsAutoScrolling] = useState(true)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [showUploadInfo, setShowUploadInfo] = useState(false)
  const [showRulesModal, setShowRulesModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    setIsAutoScrolling(true)
    setShowScrollButton(false)
  }

  const handleScroll = () => {
    if (!messagesContainerRef.current) return
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50 // 50px 여유
    
    setIsAutoScrolling(isAtBottom)
    setShowScrollButton(!isAtBottom && messages.length > 0)
  }

  useEffect(() => {
    if (isAutoScrolling) {
      scrollToBottom()
    }
  }, [messages, isAutoScrolling])

  const handleFileUpload = async (files: FileList) => {
    const uploadedFilesArray: UploadedFile[] = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      // 파일 크기 제한 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name}이(가) 너무 큽니다. 10MB 이하의 파일만 업로드할 수 있습니다.`)
        continue
      }

      try {
        const content = await readFileContent(file)
        const uploadedFile: UploadedFile = {
          id: Date.now().toString() + '-' + i,
          name: file.name,
          size: file.size,
          type: file.type,
          content,
          uploadedAt: new Date()
        }
        uploadedFilesArray.push(uploadedFile)
      } catch (error) {
        console.error(`파일 읽기 오류 (${file.name}):`, error)
        alert(`${file.name} 파일을 읽는 중 오류가 발생했습니다.`)
      }
    }

    setUploadedFiles(prev => [...prev, ...uploadedFilesArray])
  }

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        const result = e.target?.result as string
        resolve(result)
      }
      
      reader.onerror = () => reject(reader.error)
      
      // 파일 타입에 따른 처리
      if (file.type.startsWith('text/') || file.type === 'application/json') {
        reader.readAsText(file)
      } else if (file.type === 'application/pdf') {
        // PDF는 별도 처리 필요 (추후 구현)
        reader.readAsArrayBuffer(file)
      } else {
        // 기본적으로 텍스트로 읽기 시도
        reader.readAsText(file)
      }
    })
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId))
  }

  const sendMessage = async (
    content: string, 
    mode: 'general' | 'school-record' = 'general', 
    category: 'subject-detail' | 'activity' | 'behavior' | null = null, 
    options?: { subject?: string; level?: string },
    isContinuation: boolean = false
  ) => {
    if (!content.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString() + '-user',
      content,
      role: 'user',
      timestamp: new Date(),
      attachedFiles: uploadedFiles.length > 0 ? [...uploadedFiles] : undefined,
      mode: mode, // 사용자 메시지에도 모드 저장
      category: category, // 카테고리 저장
      options: options // 옵션 저장
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    setIsAutoScrolling(true)

    // 어시스턴트 메시지 추가
    const assistantMessageId = Date.now().toString() + '-assistant'
    const assistantMessage: Message = {
      id: assistantMessageId,
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      isStreaming: true,
      mode: mode, // 어시스턴트 메시지에도 모드 저장
      category: category, // 카테고리 저장
      options: options // 옵션 저장
    }

    setMessages(prev => [...prev, assistantMessage])

    try {
      // 60초 timeout을 위한 AbortController 설정
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000) // 60초
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(msg => {
            let msgContent = msg.content
            if (msg.attachedFiles && msg.attachedFiles.length > 0) {
              const fileContents = msg.attachedFiles.map(file => {
                // 파일 내용 최적화 (2000자 제한)
                const optimizedContent = optimizeFileContent(file.content, 2000)
                return `\n\n--- ${file.name} ---\n${optimizedContent}\n--- 파일 끝 ---`
              }).join('')
              msgContent = `${msg.content}${fileContents}`
            }
            return {
              role: msg.role,
              content: msgContent
            }
          }),
          mode: mode,
          category: category,
          options: options
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId) // 성공적으로 응답받으면 timeout 해제

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || `서버 오류 (${response.status})`
        
        if (response.status === 401) {
          alert('로그인이 필요하거나 API 키가 유효하지 않습니다. 다시 로그인해 주세요.')
          window.location.href = '/login'
          return
        } else if (response.status === 403) {
          throw new Error('API 키 권한이 없습니다. 관리자에게 문의하세요.')
        }
        
        throw new Error(errorMessage)
      }

      // 스트리밍 응답 처리
      if (!response.body) {
        throw new Error('응답 본문이 없습니다.')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let accumulatedContent = ''
      let isComplete = false
      let totalChunks = 0
      let responseMetadata = null
      let validationResult = null

      console.log('📨 스트리밍 응답 시작')

      try {
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) {
            console.log('📨 스트리밍 완료')
            break
          }

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // 마지막 불완전한 줄은 버퍼에 보관

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                
                if (data.type === 'chunk') {
                  // 실시간으로 콘텐츠 업데이트
                  accumulatedContent += data.content
                  totalChunks = data.chunkCount
                  
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { 
                          ...msg, 
                          content: accumulatedContent,
                          isStreaming: true
                        } 
                      : msg
                  ))
                  
                  console.log(`📤 청크 ${data.chunkCount}: "${data.content}"`)
                  
                } else if (data.type === 'complete') {
                  // 응답 완료
                  isComplete = data.isComplete
                  responseMetadata = data.metadata || {
                    chunks: data.totalChunks,
                    characters: data.totalTokens,
                    model: 'claude-sonnet-4-20250514'
                  }
                  
                  console.log('✅ 스트리밍 응답 완료:', {
                    isComplete: data.isComplete,
                    totalChunks: data.totalChunks,
                    totalTokens: data.totalTokens,
                    validation: data.validation
                  })
                  
                  // 검증 결과 저장
                  validationResult = data.validation
                  if (data.validation && data.validation.violations && data.validation.violations.length > 0) {
                    console.group('⚠️ 학교생활기록부 기재원칙 검토 결과')
                    console.warn('총', data.validation.violations.length, '개의 위반 사항이 발견되었습니다:')
                    
                    data.validation.violations.forEach((violation: any, index: number) => {
                      const emoji = violation.severity === 'critical' ? '🚨' : 
                                   violation.severity === 'warning' ? '⚠️' : 'ℹ️'
                      console.log(`${emoji} ${index + 1}. ${violation.type}`)
                      console.log(`   발견된 내용: "${violation.found}"`)
                      console.log(`   문맥: ${violation.context}`)
                      console.log(`   수정 제안: ${violation.suggestion}`)
                      console.log('---')
                    })
                    console.groupEnd()
                  }
                  
                } else if (data.type === 'error') {
                  throw new Error(data.error)
                }
              } catch (parseError) {
                console.warn('JSON 파싱 오류:', parseError, 'Line:', line)
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }

      // 최종 메시지 업데이트
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { 
              ...msg, 
              content: accumulatedContent,
              isStreaming: false,
              isComplete: isComplete,
              canContinue: !isComplete,
              metadata: responseMetadata,
              validation: validationResult
            } 
          : msg
      ))

      // 불완전한 응답 처리
      if (!isComplete && accumulatedContent && accumulatedContent.length > 0) {
        console.log('🔄 불완전한 응답 감지, 수동 연속 요청 대기 중...', { 
          mode, 
          contentLength: accumulatedContent.length 
        })
      }

    } catch (error) {
      console.error('❌ API 에러:', error)
      
      let errorMessage = '죄송합니다. 오류가 발생했습니다. 다시 시도해 주세요.'
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = '응답 시간이 60초를 초과했습니다. 더 짧고 구체적인 질문으로 다시 시도해주세요.'
        } else if (error.message.includes('429')) {
          errorMessage = 'API 사용량 한도를 초과했습니다. 잠시 후 다시 시도해주세요.'
        } else if (error.message.includes('401')) {
          errorMessage = 'API 키가 유효하지 않습니다. 설정을 확인해주세요.'
        } else if (error.message.includes('토큰') || error.message.includes('max_tokens')) {
          errorMessage = '응답이 너무 길어 중단되었습니다. 더 짧은 질문으로 시도해보세요.'
        }
      }
      
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { 
              ...msg, 
              content: errorMessage,
              isStreaming: false,
              canContinue: false
            }
          : msg
      ))
    } finally {
      setIsLoading(false)
      // 메시지 전송 후 업로드된 파일 목록 초기화 (연속 요청이 아닌 경우에만)
      if (!isContinuation) {
        setUploadedFiles([])
      }
    }
  }

  // 연속 요청 함수
  const continueMessage = async (messageId: string, providedMode?: 'general' | 'school-record', providedCategory?: 'subject-detail' | 'activity' | 'behavior' | null) => {
    if (isLoading) return

    // 메시지에서 모드와 카테고리 추출 (제공된 값이 없으면)
    let targetMode: 'general' | 'school-record' = 'general'
    let targetCategory: 'subject-detail' | 'activity' | 'behavior' | null = null
    let targetOptions: { subject?: string; level?: string } | undefined = undefined
    
    if (providedMode) {
      targetMode = providedMode
    } else {
      // messageId로 해당 메시지를 찾아서 모드 추출
      const targetMessage = messages.find(msg => msg.id === messageId)
      if (targetMessage && targetMessage.mode) {
        targetMode = targetMessage.mode
      }
    }

    if (providedCategory !== undefined) {
      targetCategory = providedCategory
    } else {
      // messageId로 해당 메시지를 찾아서 카테고리와 옵션 추출
      const targetMessage = messages.find(msg => msg.id === messageId)
      if (targetMessage && targetMessage.category) {
        targetCategory = targetMessage.category
      }
      if (targetMessage && targetMessage.options) {
        targetOptions = targetMessage.options
      }
    }

    console.log('🔄 연속 요청 시작:', { messageId, mode: targetMode, category: targetCategory, options: targetOptions })

    // "계속 작성해주세요" 메시지 자동 전송 (간결하게 이어서 작성하도록 지시)
    await sendMessage('위 내용에 이어서 간결하게 계속 작성해주세요.', targetMode, targetCategory, targetOptions)
  }

  // 파일 내용 최적화 함수 (클라이언트용)
  const optimizeFileContent = (content: string, maxLength: number = 2000): string => {
    if (content.length <= maxLength) {
      return content
    }

    // 중요한 섹션 우선 추출
    const lines = content.split('\n')
    const importantLines = []
    const normalLines = []

    for (const line of lines) {
      if (line.includes('##') || line.includes('###') || 
          line.includes('중요') || line.includes('핵심') ||
          line.includes('필수') || line.includes('금지') ||
          line.includes('목표') || line.includes('결과')) {
        importantLines.push(line)
      } else if (line.trim().length > 0) {
        normalLines.push(line)
      }
    }

    // 중요한 내용 우선, 나머지는 길이에 맞춰 추가
    let result = importantLines.join('\n')
    
    for (const line of normalLines) {
      if (result.length + line.length + 1 <= maxLength) {
        result += '\n' + line
      } else {
        break
      }
    }

    if (result.length < content.length) {
      result += '\n\n[... 내용 일부 생략 ...]'
    }

    return result
  }

  const resetChat = () => {
    setMessages([])
  }

  return (
    <div className="flex flex-col flex-1 bg-white">
      {/* ChatGPT 스타일 헤더 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Image
              src="/sdjgh_logo.png"
              alt="SDJGH"
              width={32}
              height={32}
              className="w-8 h-8"
            />
            <h1 className="text-lg font-bold text-gray-800">서대전여자고등학교 교직원 전용 AI</h1>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowRulesModal(true)}
              className="text-sm text-green-600 hover:text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors border border-blue-200 hover:border-blue-300"
              title="학교생활기록부 기재 원칙"
            >
              학교생활기록부 기재 원칙
            </button>
            <button
              onClick={resetChat}
              className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="새 채팅"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ChatGPT 스타일 메시지 영역 */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto relative"
        onScroll={handleScroll}
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full py-12">
            <div className="text-center px-6 max-w-2xl">
              <h2 className="text-3xl font-semibold text-gray-800 mb-8 text-center">서여고 교직원 전용 AI와 대화하기</h2>
              <a 
                href="https://lifeprofessor.github.io/python_edu/sdj_teacher_training.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium border border-blue-200 hover:border-blue-300 px-4 py-2 rounded-lg transition-colors text-center mb-6"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                학생부 작성을 위한 맞춤형 프롬프트 제작 자동화 도구
              </a>
              
              {/* 서비스 안내 */}
              <div className="mt-3 bg-blue-50 rounded-lg p-6 text-sm text-blue-800">
                <p className="text-center">
                  💡 <strong>이 AI는 서대전여자고등학교 교직원의 생활기록부 작성 지원 전용 서비스입니다.</strong><br/>
                  일반적인 질의응답은 아래 생성형 AI 도구들을 활용해 주세요.
                </p>
              </div>

               {/* 생성형 AI 링크들 */}
               <div className="mt-3">
                 <div className="grid grid-cols-4 gap-3">
                  <a 
                    href="https://chat.openai.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 px-4 py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                    title="ChatGPT"
                  >
                    <Image
                      src="/chatgpt-logo.png"
                      alt="ChatGPT"
                      width={350}
                      height={32}
                    />
                  </a>
                  
                  <a 
                    href="https://gemini.google.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center border border-blue-200 hover:border-blue-300 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                    title="Gemini"
                  >
                    <Image
                      src="/gemini-logo2.png"
                      alt="Gemini"
                      width={80}
                      height={32}
                    />
                  </a>
                  
                  <a 
                    href="https://notebooklm.google.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center border border-orange-200 hover:border-orange-300 bg-orange-50 hover:bg-orange-100 px-4 py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                    title="NotebookLM"
                  >
                    <Image
                      src="/notebooklm-logo.png"
                      alt="NotebookLM"
                      width={120}
                      height={50}
                    />
                  </a>
                  
                  <a 
                    href="https://wrtn.ai" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center border border-indigo-200 hover:border-indigo-300 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                    title="뤼튼"
                  >
                    <Image
                      src="/wrtn-logo.png"
                      alt="뤼튼"
                      width={60}
                      height={32}
                    />
                  </a>
                </div>

                {/* 파일 업로드 정보 토글 */}
                <div className="mt-3">
                  <button
                    onClick={() => setShowUploadInfo(!showUploadInfo)}
                    className="flex items-center justify-center w-full text-gray-600 hover:text-gray-800 text-sm font-medium border border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100 px-4 py-3 rounded-lg transition-all duration-200"
                  >
                    <svg 
                      className={`w-4 h-4 mr-2 transition-transform duration-200 ${showUploadInfo ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    📎 파일 업로드 지원 정보
                  </button>
                  
                  {showUploadInfo && (
                    <div className="mt-3 bg-gray-50 rounded-lg p-4 text-sm border border-gray-200 animate-in slide-in-from-top-2 duration-200">
                      <p className="text-left text-gray-700 mb-2">
                        📎 <strong>업로드 가능:</strong> <span className="text-green-600">텍스트(.txt), 마크다운(.md), CSV(.csv)</span>
                      </p>
                      <p className="text-left text-gray-700">
                        ❌ <strong>업로드 불가:</strong> <span className="text-red-600">한글(.hwp), 워드(.docx), PDF(.pdf), 엑셀(.xlsx)</span>
                      </p>
                      <div className="mt-4 text-xs text-gray-600 text-center">
                        📎 파일 크기 제한: 10MB 이하 | 다중 파일 업로드 지원
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <MessageList 
            messages={messages} 
            onContinueMessage={continueMessage}
          />
        )}
        <div ref={messagesEndRef} />
        
        {/* 아래로 스크롤 버튼 */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="fixed bottom-24 right-8 bg-white hover:bg-gray-50 border border-gray-300 rounded-full p-2 shadow-md hover:shadow-lg transition-all duration-200 z-10"
            title="맨 아래로 이동"
          >
            <svg 
              className="w-5 h-5 text-gray-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 14l-7 7m0 0l-7-7m7 7V3" 
              />
            </svg>
          </button>
        )}
      </div>

      {/* ChatGPT 스타일 입력 영역 */}
      <div className="border-t border-gray-200 bg-white pb-safe">
        <div className="max-w-3xl mx-auto px-4 py-6 pb-8">
          <InputArea 
            onSendMessage={sendMessage} 
            disabled={isLoading}
            onFileUpload={handleFileUpload}
            uploadedFiles={uploadedFiles}
            onRemoveFile={removeFile}
          />
        </div>
      </div>

      {/* 학교생활기록부 기재 원칙 모달 */}
      {showRulesModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowRulesModal(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">학교생활기록부 기재 원칙 및 점검 기준</h2>
              <button
                onClick={() => setShowRulesModal(false)}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="닫기"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 모달 내용 */}
            <div className="overflow-y-auto p-6 space-y-6">
              {/* I. 공통 기재 원칙 */}
              <section>
                <h3 className="text-xl font-bold text-gray-800 mb-4">I. 공통 기재 원칙 (전체 항목 적용)</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="font-semibold text-gray-900 mr-2">• 객관성:</span>
                    <span>모든 내용은 교사가 직접 관찰하고 평가한 사실에 근거하여 객관적으로 작성한다.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-semibold text-gray-900 mr-2">• 과정 중심:</span>
                    <span>활동의 결과 나열보다 동기, 과정, 성장, 변화를 중심으로 서술한다.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-semibold text-gray-900 mr-2">• 구체성:</span>
                    <span>추상적인 표현('성실함', '뛰어남')을 지양하고, 구체적인 사례와 근거를 통해 학생의 특성이 드러나도록 작성한다.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-semibold text-gray-900 mr-2">• 개별화:</span>
                    <span>다른 학생과 복사-붙여넣기한 듯한 내용이 아닌, 학생 고유의 특성과 역량이 나타나도록 서술한다.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-semibold text-gray-900 mr-2">• 자기주도성:</span>
                    <span>학생이 주도적으로 수행한 역할, 노력, 탐구 과정 등을 부각한다.</span>
                  </li>
                </ul>
              </section>

              {/* II. 기재 금지 항목 */}
              <section>
                <h3 className="text-xl font-bold text-gray-800 mb-4">II. 기재 금지 항목 (입력 시 반드시 필터링)</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• 공인어학성적: 토익, 토플, 텝스, HSK 등 모든 공인어학시험 성적.</li>
                  <li>• 외부 수상실적: 교외 기관에서 수상한 상장 및 실적. (교내 수상실적은 '수상경력' 항목에만 기재)</li>
                  <li>• 논문 및 학회 발표: KCI 등재 여부를 불문하고 모든 논문, 학회 발표 사실.</li>
                  <li>• 도서 출간 사실: 학생이 저자로 참여한 도서 출간 사실.</li>
                  <li>• 지식재산권: 발명특허, 실용신안 등 지식재산권 관련 내용.</li>
                  <li>• 해외 활동 실적: 어학연수 등 해외 활동 실적.</li>
                  <li>• 교외 인증시험: 한자능력검정, 한국사능력검정시험 등 교외 인증시험 점수 및 등급.</li>
                  <li>• 부모 및 가족 정보: 부모 및 친인척의 사회·경제적 지위(직업명, 직장명, 직위 등)를 암시하는 모든 내용.</li>
                  <li>• 사교육 유발 요인: 특정 대학명, 기관명 언급, 고액 과외나 컨설팅 등을 암시하는 내용.</li>
                  <li>• 자격증 취득 사항: '자격증 및 인증 취득상황' 란에 기재되지 않은 자격증 내용.</li>
                </ul>
              </section>

              {/* III. 항목별 핵심 기재 요령 */}
              <section>
                <h3 className="text-xl font-bold text-gray-800 mb-4">III. 항목별 핵심 기재 요령</h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">인적·학적사항</h4>
                    <p className="text-gray-700">학생 본인의 정보만 기재하며, '특기사항' 란에 부모 정보는 절대 기재하지 않는다.</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">출결상황</h4>
                    <ul className="text-gray-700 space-y-1">
                      <li>• '무단'이라는 용어는 '미인정'으로 통일하여 사용한다.</li>
                      <li>• 결석, 지각, 조퇴, 결과 사유를 '미인정', '질병', '기타'로 명확히 구분한다.</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">창의적 체험활동상황</h4>
                    <div className="space-y-3 ml-4">
                      <div>
                        <h5 className="font-medium text-gray-900 mb-1">자율활동 (연 500자)</h5>
                        <p className="text-gray-700">학급·학교 내에서 학생의 역할(반장, 부장 등)과 그 역할을 통한 리더십, 협업 능력, 기여도를 구체적 사례로 서술한다.</p>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900 mb-1">동아리활동 (연 500자)</h5>
                        <p className="text-gray-700">학생의 관심 분야와 진로 관련 탐구 역량을 보여주는 핵심 영역. 동아리 내 역할, 탐구 주제, 탐구 과정, 심화 학습 내용을 중심으로 기재한다. 자율 동아리는 학년당 1개만 기재</p>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900 mb-1">봉사활동</h5>
                        <ul className="text-gray-700 space-y-1">
                          <li>• 개인 봉사는 '학교교육계획에 따라 교사가 지도한 실적'만 기재.</li>
                          <li>• 특기사항은 기재하지 않고 시간만 기록.</li>
                          <li>• (대입에는 교내 봉사 실적만 반영됨)</li>
                        </ul>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900 mb-1">진로활동 (연 700자)</h5>
                        <p className="text-gray-700">학생의 진로 탐색 과정과 노력을 기록. 진로 검사, 상담, 체험, 탐구 활동 등을 통해 진로 희망이 어떻게 구체화되고 심화되었는지 서술한다.</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">교과학습발달상황 (세부능력 및 특기사항)</h4>
                    <p className="text-gray-700">수업 시간 중 학생의 학업 역량, 지적 호기심, 탐구 능력, 발표, 토론 태도 등을 구체적으로 서술한다. 단순 지식의 습득보다는, 특정 개념에 대한 심화 탐구, 과목 간 연계, 실생활 적용 사례 등을 중심으로 기재하여 학생의 우수성을 보여준다. 독서활동과 연계하여, 특정 책을 읽고 심화 탐구를 진행한 내용을 서술할 수 있다.</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">독서활동상황</h4>
                    <ul className="text-gray-700 space-y-1">
                      <li>• '도서명(저자)' 형식을 반드시 준수한다. (예: 공중그네(오쿠다 히데오))</li>
                      <li>• 줄거리 요약, 감상, 평가 등 서술형 내용은 일절 기재하지 않는다.</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">행동특성 및 종합의견 (연 500자)</h4>
                    <p className="text-gray-700">담임교사가 1년간 학생을 종합적으로 관찰한 내용을 바탕으로 인성, 잠재력, 성장 가능성 등을 구체적인 사례를 근거로 작성한다. 학생의 장점을 중심으로 긍정적으로 서술하되, 단점의 경우 개선 및 성장 모습과 함께 기록할 수 있다.</p>
                  </div>
                </div>
              </section>

              {/* IV. 서식 및 문체 규칙 */}
              <section>
                <h3 className="text-xl font-bold text-gray-800 mb-4">IV. 서식 및 문체 규칙</h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">명사형 어미 사용</h4>
                    <p className="text-gray-700 mb-2">모든 서술형 문장의 어미는 '~함', '~음', '~됨' 등 명사형으로 종결한다.</p>
                    <div className="bg-green-50 border-l-4 border-green-500 p-3 mb-2">
                      <p className="text-sm text-gray-700">✅ 올바른 예시: "관련 자료를 분석하여 논리적으로 발표함."</p>
                    </div>
                    <div className="bg-red-50 border-l-4 border-red-500 p-3">
                      <p className="text-sm text-gray-700">❌ 잘못된 예시: "발표하였습니다." / "발표했다."</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">한글 사용 원칙</h4>
                    <p className="text-gray-700 mb-2">가급적 한글로 작성하며, 의미 전달을 위해 꼭 필요한 경우에만 외국어를 병기하거나 괄호 안에 한자를 병기할 수 있다.</p>
                    <div className="bg-green-50 border-l-4 border-green-500 p-3 mb-2">
                      <p className="text-sm text-gray-700">✅ 예시: '딥러닝(Deep Learning)'</p>
                    </div>
                    <div className="bg-red-50 border-l-4 border-red-500 p-3">
                      <p className="text-sm text-gray-700">❌ 예시: 'R&E(Research and Education) 프로그램' → '심화 연구 교육 프로그램'</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">1인칭 시점 금지</h4>
                    <p className="text-gray-700">'저는', '제가' 등 학생의 시점에서 서술하는 문장은 허용되지 않는다.</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">축약어 및 은어 금지</h4>
                    <p className="text-gray-700">'생기부', '세특'과 같은 축약어 대신 '학교생활기록부', '세부능력 및 특기사항' 등 공식 명칭을 사용한다.</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">간결성</h4>
                    <p className="text-gray-700">문장은 간결하고 명확하게 작성하며, 미사여구나 불필요한 수식어 사용을 자제한다.</p>
                  </div>
                </div>
              </section>

              {/* V. 검증 체크리스트 */}
              <section>
                <h3 className="text-xl font-bold text-gray-800 mb-4">V. 검증 체크리스트</h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">기재 금지 항목 체크</h4>
                    <ul className="space-y-1 text-gray-700">
                      <li className="flex items-center">
                        <input type="checkbox" className="mr-2" disabled />
                        <span>공인어학성적 언급 없음</span>
                      </li>
                      <li className="flex items-center">
                        <input type="checkbox" className="mr-2" disabled />
                        <span>외부 수상실적 언급 없음</span>
                      </li>
                      <li className="flex items-center">
                        <input type="checkbox" className="mr-2" disabled />
                        <span>논문/학회 발표 언급 없음</span>
                      </li>
                      <li className="flex items-center">
                        <input type="checkbox" className="mr-2" disabled />
                        <span>부모/가족 정보 언급 없음</span>
                      </li>
                      <li className="flex items-center">
                        <input type="checkbox" className="mr-2" disabled />
                        <span>특정 대학명/기관명 언급 없음</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">문체 및 서식 체크</h4>
                    <ul className="space-y-1 text-gray-700">
                      <li className="flex items-center">
                        <input type="checkbox" className="mr-2" disabled />
                        <span>모든 문장이 명사형 어미로 종결됨</span>
                      </li>
                      <li className="flex items-center">
                        <input type="checkbox" className="mr-2" disabled />
                        <span>1인칭 시점 사용하지 않음</span>
                      </li>
                      <li className="flex items-center">
                        <input type="checkbox" className="mr-2" disabled />
                        <span>축약어 사용하지 않음</span>
                      </li>
                      <li className="flex items-center">
                        <input type="checkbox" className="mr-2" disabled />
                        <span>구체적인 사례와 근거 포함</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">내용 품질 체크</h4>
                    <ul className="space-y-1 text-gray-700">
                      <li className="flex items-center">
                        <input type="checkbox" className="mr-2" disabled />
                        <span>학생 고유의 특성이 드러남</span>
                      </li>
                      <li className="flex items-center">
                        <input type="checkbox" className="mr-2" disabled />
                        <span>과정 중심으로 서술됨</span>
                      </li>
                      <li className="flex items-center">
                        <input type="checkbox" className="mr-2" disabled />
                        <span>자기주도적 활동이 부각됨</span>
                      </li>
                      <li className="flex items-center">
                        <input type="checkbox" className="mr-2" disabled />
                        <span>객관적 사실에 근거함</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
