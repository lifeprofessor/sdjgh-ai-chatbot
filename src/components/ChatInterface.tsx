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

  const sendMessage = async (content: string, mode: 'general' | 'school-record' = 'general') => {
    if (!content.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString() + '-user',
      content,
      role: 'user',
      timestamp: new Date(),
      attachedFiles: uploadedFiles.length > 0 ? [...uploadedFiles] : undefined
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    setIsAutoScrolling(true) // 새 메시지 시작 시 자동 스크롤 활성화

    // 스트리밍 응답을 위한 빈 어시스턴트 메시지 추가
    const assistantMessageId = Date.now().toString() + '-assistant'
    const assistantMessage: Message = {
      id: assistantMessageId,
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      isStreaming: true
    }

    setMessages(prev => [...prev, assistantMessage])

    // 파일 내용을 포함한 메시지 생성
    let enhancedContent = content
    if (uploadedFiles.length > 0) {
      const fileContents = uploadedFiles.map(file => 
        `\n\n--- ${file.name} ---\n${file.content}\n--- 파일 끝 ---`
      ).join('')
      enhancedContent = `${content}${fileContents}`
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(msg => {
            let msgContent = msg.content
            // 각 메시지에 첨부된 파일 내용도 포함
            if (msg.attachedFiles && msg.attachedFiles.length > 0) {
              const fileContents = msg.attachedFiles.map(file => 
                `\n\n--- ${file.name} ---\n${file.content}\n--- 파일 끝 ---`
              ).join('')
              msgContent = `${msg.content}${fileContents}`
            }
            return {
              role: msg.role,
              content: msgContent
            }
          }),
          mode: mode // 선택된 모드 전달
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || `서버 오류 (${response.status})`
        
        if (response.status === 401) {
          // 인증 오류 - 로그인 페이지로 리다이렉트
          alert('로그인이 필요하거나 API 키가 유효하지 않습니다. 다시 로그인해 주세요.')
          window.location.href = '/login'
          return
        } else if (response.status === 403) {
          throw new Error('API 키 권한이 없습니다. 관리자에게 문의하세요.')
        }
        
        throw new Error(errorMessage)
      }

      // 스트리밍 응답 처리
      const reader = response.body?.getReader()
      if (!reader) throw new Error('스트림을 읽을 수 없습니다.')

      let accumulatedContent = ''
      let chunkCount = 0

      console.log('🚀 스트리밍 시작')

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log('✅ 스트리밍 완료!')
          break
        }

        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              // 스트리밍 완료
              console.log(`🏁 스트리밍 종료 신호 받음. 총 청크: ${chunkCount}, 총 내용 길이: ${accumulatedContent.length}`)
              setMessages(prev => prev.map(msg => 
                msg.id === assistantMessageId 
                  ? { ...msg, isStreaming: false }
                  : msg
              ))
              break
            }

            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                chunkCount++
                accumulatedContent += parsed.content
                console.log(`📨 청크 ${chunkCount} 받음: "${parsed.content.slice(0, 30)}${parsed.content.length > 30 ? '...' : ''}" (현재 총 길이: ${accumulatedContent.length})`)
                
                // 실시간으로 메시지 업데이트
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? { ...msg, content: accumulatedContent }
                    : msg
                ))
              }
              if (parsed.warning && parsed.violations) {
                // 학교생활기록부 검증 결과 처리
                console.warn('⚠️ 학교생활기록부 기재 원칙 위반:', parsed.violations)
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? { 
                        ...msg, 
                        validation: {
                          warning: parsed.warning,
                          violations: parsed.violations
                        }
                      }
                    : msg
                ))
              }
              if (parsed.error) {
                console.error('❌ API에서 에러 응답:', parsed.error)
                throw new Error(parsed.error)
              }
            } catch (e) {
              // JSON 파싱 오류 무시 (일부 청크는 불완전할 수 있음)
              if (data !== '' && data !== '\n') {
                console.warn('⚠️ JSON 파싱 오류 (무시됨):', data)
              }
            }
          }
        }
      }

    } catch (error) {
      console.error('❌ 스트리밍 에러:', error)
      
      let errorMessage = '죄송합니다. 오류가 발생했습니다. 다시 시도해 주세요.'
      
      // HTTP 에러에 따른 구체적인 메시지
      if (error instanceof Error) {
        if (error.message.includes('429')) {
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
              isStreaming: false
            }
          : msg
      ))
    } finally {
      setIsLoading(false)
      // 메시지 전송 후 업로드된 파일 목록 초기화
      setUploadedFiles([])
    }
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
          <MessageList messages={messages} />
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
