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
    violations?: string[]
  }
  isComplete?: boolean
  canContinue?: boolean
  mode?: 'general' | 'school-record' // 메시지에 모드 정보 저장
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

  const sendMessage = async (content: string, mode: 'general' | 'school-record' = 'general', isContinuation: boolean = false) => {
    if (!content.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString() + '-user',
      content,
      role: 'user',
      timestamp: new Date(),
      attachedFiles: uploadedFiles.length > 0 ? [...uploadedFiles] : undefined,
      mode: mode // 사용자 메시지에도 모드 저장
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
      mode: mode // 어시스턴트 메시지에도 모드 저장
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
          mode: mode
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

      // 비스트리밍 응답 처리
      const data = await response.json()
      
      console.log('📨 응답 받음:', {
        contentLength: data.content?.length || 0,
        isComplete: data.isComplete,
        chunks: data.metadata?.chunks || 0,
        timeout: data.metadata?.timeout
      })

      if (data.error) {
        throw new Error(data.error)
      }

      // 메시지 업데이트
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { 
              ...msg, 
              content: data.content || '',
              isStreaming: false,
              isComplete: data.isComplete,
              canContinue: !data.isComplete, // 불완전한 응답이면 계속 요청 가능
              validation: data.validation,
              metadata: data.metadata
            }
          : msg
      ))

      // 자동 연속 요청 비활성화 - 사용자가 수동으로 "계속 작성하기" 버튼을 클릭해야 함
      if (!data.isComplete && data.content && data.content.length > 0) {
        if (data.metadata?.timeout) {
          console.log('🔄 타임아웃으로 인한 불완전한 응답 감지, 수동 연속 요청 대기 중...', { 
            mode, 
            timeout: data.metadata.timeout,
            contentLength: data.content.length 
          })
        } else {
          console.log('🔄 불완전한 응답 감지 (타임아웃 아님), 수동 연속 요청 대기 중...', { 
            isComplete: data.isComplete, 
            timeout: data.metadata?.timeout,
            contentLength: data.content.length 
          })
        }
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
  const continueMessage = async (messageId: string, providedMode?: 'general' | 'school-record') => {
    if (isLoading) return

    // 메시지에서 모드 추출 (제공된 모드가 없으면)
    let targetMode: 'general' | 'school-record' = 'general'
    
    if (providedMode) {
      targetMode = providedMode
    } else {
      // messageId로 해당 메시지를 찾아서 모드 추출
      const targetMessage = messages.find(msg => msg.id === messageId)
      if (targetMessage && targetMessage.mode) {
        targetMode = targetMessage.mode
      }
    }

    console.log('🔄 연속 요청 시작:', { messageId, mode: targetMode })

    // "계속 작성해주세요" 메시지 자동 전송 (간결하게 이어서 작성하도록 지시)
    await sendMessage('위 내용에 이어서 간결하게 계속 작성해주세요.', targetMode, true)
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
    </div>
  )
}
