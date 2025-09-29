'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  content: string
  uploadedAt: Date
}

interface InputAreaProps {
  onSendMessage: (message: string, mode?: 'general' | 'school-record') => void
  disabled?: boolean
  onFileUpload?: (files: FileList) => void
  uploadedFiles?: UploadedFile[]
  onRemoveFile?: (fileId: string) => void
}

export default function InputArea({ 
  onSendMessage, 
  disabled = false, 
  onFileUpload,
  uploadedFiles = [],
  onRemoveFile 
}: InputAreaProps) {
  const [message, setMessage] = useState('')
  const [selectedMode, setSelectedMode] = useState<'general' | 'school-record'>('general')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 텍스트에리어 높이 자동 조절 함수
  const adjustHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px'
    }
  }

  // 메시지가 변경될 때마다 높이 조절
  useEffect(() => {
    adjustHeight()
  }, [message])

  const handleSubmit = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim(), selectedMode)
      setMessage('')
      // 메시지 초기화 후 높이도 초기화
      setTimeout(adjustHeight, 0)
    }
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleFileClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0 && onFileUpload) {
      onFileUpload(files)
    }
    // 같은 파일을 다시 선택할 수 있도록 value를 초기화
    e.target.value = ''
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
      {/* 모드 선택 버튼들 */}
      <div className="mb-4">
        <div className="flex gap-2 flex-wrap">
        <button
            onClick={() => setSelectedMode('school-record')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              selectedMode === 'school-record'
                ? 'bg-green-100 text-green-700 border-2 border-green-300'
                : 'bg-gray-100 text-gray-700 border-2 border-gray-200 hover:bg-gray-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            학교생활기록부 작성
          </button>

          <button
            onClick={() => setSelectedMode('general')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              selectedMode === 'general'
                ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                : 'bg-gray-100 text-gray-700 border-2 border-gray-200 hover:bg-gray-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            일반 채팅
          </button>

          
        </div>
        
        {/* 선택된 모드 설명 */}
        <div className="mt-2 text-xs text-gray-600">
          {selectedMode === 'general' ? (
            <span>💬 일반적인 대화와 질문에 답변합니다.</span>
          ) : (
            <span>📋 학교생활기록부 기재 원칙을 준수하여 작성합니다. (기재 금지 항목 자동 검증)</span>
          )}
        </div>
      </div>

      {/* 업로드된 파일 목록 */}
      {uploadedFiles.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm"
              >
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-blue-800 font-medium">{file.name}</span>
                <span className="text-blue-600">({formatFileSize(file.size)})</span>
                {onRemoveFile && (
                  <button
                    onClick={() => onRemoveFile(file.id)}
                    className="text-blue-600 hover:text-red-600 transition-colors"
                    title="파일 제거"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="메시지를 입력하세요..."
          className="w-full resize-none border border-gray-300 rounded-xl px-4 py-3 pr-20 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-800 placeholder-gray-500"
          rows={1}
          style={{
            minHeight: '52px',
            maxHeight: '200px'
          }}
          disabled={disabled}
          onInput={adjustHeight}
        />
        
        {/* 파일 업로드 버튼 */}
        {onFileUpload && (
          <button
            onClick={handleFileClick}
            disabled={disabled}
            className="absolute right-14 bottom-3 w-8 h-8 text-gray-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            title="파일 업로드"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
        )}

        {/* 메시지 전송 버튼 */}
        <button
          onClick={handleSubmit}
          disabled={!message.trim() || disabled}
          className="absolute right-3 bottom-3 w-8 h-8 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-md transition-colors flex items-center justify-center"
        >
          {disabled ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>

        {/* 숨겨진 파일 입력 */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".txt,.json,.csv,.md,.html,.xml,.js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.h,.css,.scss,.less,.php,.rb,.go,.rs,.sh,.sql,.yaml,.yml,.toml,.ini,.conf,.log"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      <div className="text-xs text-gray-500 mt-2 text-center">
      서여고 교직원 전용 AI는 실수를 할 수 있습니다. 중요한 정보는 반드시 직접 확인하세요.
      </div>
    </div>
  )
}
