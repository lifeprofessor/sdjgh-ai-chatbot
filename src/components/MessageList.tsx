'use client'

import { Message, UploadedFile } from './ChatInterface'
import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import Image from 'next/image'

interface MessageListProps {
  messages: Message[]
}

function TypewriterText({ text, isStreaming }: { text: string, isStreaming?: boolean }) {
  const [displayedText, setDisplayedText] = useState('')

  useEffect(() => {
    if (isStreaming) {
      setDisplayedText(text)
    } else {
      // 완료된 메시지는 즉시 표시
      setDisplayedText(text)
    }
  }, [text, isStreaming])

  return (
    <div className="break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // 코드 블록 스타일링
          code: ({ node, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '')
            const isInline = !match
            return isInline ? (
              <code className="bg-gray-100 text-red-600 px-1 py-0.5 rounded text-sm font-mono" {...props}>
                {children}
              </code>
            ) : (
              <code className="block bg-gray-900 text-gray-100 p-4 rounded-lg my-2 overflow-x-auto font-mono text-sm" {...props}>
                {children}
              </code>
            )
          },
          // 인용문 스타일링
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-300 pl-4 my-2 italic text-gray-600">
              {children}
            </blockquote>
          ),
          // 링크 스타일링
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              {children}
            </a>
          ),
          // 제목 스타일링
          h1: ({ children }) => <h1 className="text-xl font-bold my-3">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold my-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-bold my-2">{children}</h3>,
          // 리스트 스타일링
          ul: ({ children }) => <ul className="list-disc pl-6 my-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6 my-2">{children}</ol>,
          li: ({ children }) => <li className="my-1">{children}</li>,
          // 테이블 스타일링
          table: ({ children }) => (
            <table className="border-collapse border border-gray-300 my-2 w-full">
              {children}
            </table>
          ),
          th: ({ children }) => (
            <th className="border border-gray-300 px-2 py-1 bg-gray-100 font-bold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-gray-300 px-2 py-1">
              {children}
            </td>
          ),
        }}
      >
        {displayedText}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-2 h-5 bg-gray-400 animate-pulse ml-1"></span>
      )}
    </div>
  )
}

export default function MessageList({ messages }: MessageListProps) {
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)

  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedMessageId(messageId)
      console.log('📋 메시지 복사 완료:', text.slice(0, 50) + '...')
      
      // 2초 후 복사 상태 초기화
      setTimeout(() => {
        setCopiedMessageId(null)
      }, 2000)
    } catch (error) {
      console.error('❌ 복사 실패:', error)
      alert('복사에 실패했습니다.')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div>
      {messages.map((message, index) => (
        <div key={message.id} className={`group ${
          message.role === 'assistant' ? 'bg-gray-50' : 'bg-white'
        } border-b border-gray-100 relative`}>
          <div className="max-w-3xl mx-auto px-4 py-6">
            <div className="flex items-start space-x-4">
              {/* 아바타 */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-sm flex items-center justify-center text-xs font-medium ${
                message.role === 'user' 
                  ? 'bg-gray-800 text-white' 
                  : 'bg-white border border-gray-300'
              }`}>
                {message.role === 'user' ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <Image
                    src="/sdjgh_logo.png"
                    alt="SDJGH Logo"
                    width={16}
                    height={16}
                    className="w-4 h-4 rounded-sm"
                  />
                )}
              </div>

              {/* 메시지 내용 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-bold text-gray-900">
                    {message.role === 'user' ? 'Teacher' : 'Assistant'}
                  </div>
                  
                  {/* 복사 버튼 - 메시지가 완료되었고 내용이 있을 때만 표시 */}
                  {!message.isStreaming && message.content.trim() && (
                    <button
                      onClick={() => copyToClipboard(message.content, message.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-gray-700"
                      title={copiedMessageId === message.id ? "복사됨!" : "복사하기"}
                    >
                      {copiedMessageId === message.id ? (
                        // 복사 완료 아이콘
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        // 복사 아이콘
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>

                {/* 첨부된 파일 표시 */}
                {message.attachedFiles && message.attachedFiles.length > 0 && (
                  <div className="mb-3">
                    <div className="flex flex-wrap gap-2">
                      {message.attachedFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                        >
                          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-gray-700 font-medium">{file.name}</span>
                          <span className="text-gray-500">({formatFileSize(file.size)})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-gray-800 leading-relaxed">
                  <TypewriterText 
                    text={message.content} 
                    isStreaming={message.isStreaming}
                  />
                </div>

                {/* 학교생활기록부 검증 결과 표시 */}
                {message.validation && message.validation.violations && message.validation.violations.length > 0 && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-yellow-800 mb-2">
                          ⚠️ {message.validation.warning}
                        </h4>
                        <ul className="text-sm text-yellow-700 space-y-1">
                          {message.validation.violations.map((violation, index) => (
                            <li key={index} className="flex items-start">
                              <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                              {violation}
                            </li>
                          ))}
                        </ul>
                        <div className="mt-2 text-xs text-yellow-600">
                          💡 위 사항들을 수정하여 다시 작성해달라고 요청해보세요.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}