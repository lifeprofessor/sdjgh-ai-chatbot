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

type SchoolRecordCategory = 'subject-detail' | 'activity' | 'behavior' | null

type SubjectType = '국어' | '수학' | '영어' | '사회' | '과학' | '체육' | '미술' | '음악' | '정보' | '한문'
type DetailLevel = 'advanced' | 'intermediate' | 'basic'

interface InputAreaProps {
  onSendMessage: (
    message: string, 
    mode?: 'general' | 'school-record' | 'school-record-review', // 검토 모드 추가
    category?: SchoolRecordCategory,
    options?: {
      subject?: SubjectType
      level?: DetailLevel
    }
  ) => void
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
  const [selectedMode, setSelectedMode] = useState<'general' | 'school-record' | 'school-record-review'>('general')
  const [selectedCategory, setSelectedCategory] = useState<SchoolRecordCategory>(null)
  const [selectedSubject, setSelectedSubject] = useState<SubjectType>('국어')
  const [selectedLevel, setSelectedLevel] = useState<DetailLevel>('intermediate')
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
      const options = (selectedMode === 'school-record' || selectedMode === 'school-record-review') && selectedCategory === 'subject-detail'
        ? { subject: selectedSubject, level: selectedLevel }
        : undefined
      
      onSendMessage(message.trim(), selectedMode, selectedCategory, options)
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
            onClick={() => {
              setSelectedMode('school-record')
              if (!selectedCategory) setSelectedCategory('subject-detail')
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              selectedMode === 'school-record'
                ? 'bg-green-100 text-green-700 border-2 border-green-300'
                : 'bg-gray-100 text-gray-700 border-2 border-gray-200 hover:bg-gray-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            생기부 작성
          </button>

          <button
            onClick={() => {
              setSelectedMode('school-record-review')
              setSelectedCategory(null)
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              selectedMode === 'school-record-review'
                ? 'bg-orange-100 text-orange-700 border-2 border-orange-300'
                : 'bg-gray-100 text-gray-700 border-2 border-gray-200 hover:bg-gray-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            생기부 검토
          </button>

          <button
            onClick={() => {
              setSelectedMode('general')
              setSelectedCategory(null)
            }}
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
        
        {/* 생기부 검토 모드 안내 */}
        {selectedMode === 'school-record-review' && (
          <div className="mt-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <div className="text-sm font-semibold text-orange-800 mb-1">📋 생기부 검토 모드</div>
                <div className="text-xs text-orange-700 space-y-1">
                  <p>• 작성하신 생기부 원문을 아래에 붙여넣어 주세요</p>
                  <p>• AI가 기재 원칙 위반 사항을 검토하고 개선안을 제시합니다</p>
                  <p>• 금지 항목, 문체, 표현 등을 종합적으로 점검합니다</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* 학교생활기록부 카테고리 선택 */}
        {selectedMode === 'school-record' && (
          <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="text-xs font-semibold text-green-800 mb-2">📂 작성 항목 선택:</div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedCategory('subject-detail')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedCategory === 'subject-detail'
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-green-700 border border-green-300 hover:bg-green-100'
                }`}
              >
                📚 교과 세부능력 및 특기사항
              </button>
              <button
                onClick={() => setSelectedCategory('activity')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedCategory === 'activity'
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-green-700 border border-green-300 hover:bg-green-100'
                }`}
              >
                🎯 창의적 체험활동 특기사항
              </button>
              <button
                onClick={() => setSelectedCategory('behavior')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedCategory === 'behavior'
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-green-700 border border-green-300 hover:bg-green-100'
                }`}
              >
                ⭐ 행동특성 및 종합의견
              </button>
            </div>

            {/* 교과 세부능력 및 특기사항 선택 시 추가 옵션 */}
            {selectedCategory === 'subject-detail' && (
              <div className="mt-3 space-y-3">
                {/* 교과명 선택 */}
                <div>
                  <label className="text-xs font-semibold text-green-800 mb-1.5 block">
                    📖 교과명:
                  </label>
                  <div className="flex gap-1.5 flex-wrap">
                    {(['국어', '수학', '영어', '사회', '과학', '체육', '미술', '음악', '정보', '한문'] as SubjectType[]).map((subject) => (
                      <button
                        key={subject}
                        onClick={() => setSelectedSubject(subject)}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                          selectedSubject === subject
                            ? 'bg-green-600 text-white'
                            : 'bg-white text-green-700 border border-green-200 hover:bg-green-50'
                        }`}
                      >
                        {subject}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 작성 수준 선택 */}
                <div>
                  <label className="text-xs font-semibold text-green-800 mb-1.5 block">
                    📊 작성 수준:
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setSelectedLevel('advanced')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedLevel === 'advanced'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-50'
                      }`}
                    >
                      🥇 상급 (500자)
                      <div className="text-[10px] opacity-80 mt-0.5">심화활동·독창적결과물</div>
                    </button>
                    <button
                      onClick={() => setSelectedLevel('intermediate')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedLevel === 'intermediate'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
                      }`}
                    >
                      🥈 중급 (400~500자)
                      <div className="text-[10px] opacity-80 mt-0.5">일반참여·기본과제</div>
                    </button>
                    <button
                      onClick={() => setSelectedLevel('basic')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedLevel === 'basic'
                          ? 'bg-orange-600 text-white'
                          : 'bg-white text-orange-700 border border-orange-200 hover:bg-orange-50'
                      }`}
                    >
                      🥉 기본 (200~300자)
                      <div className="text-[10px] opacity-80 mt-0.5">참여도낮음·사실중심</div>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* 선택된 모드 설명 */}
        <div className="mt-2 text-xs text-gray-600">
          {selectedMode === 'general' ? (
            <span>💬 일반적인 대화와 질문에 답변합니다.</span>
          ) : (
            <span>
              📋 학교생활기록부 기재 원칙을 준수하여 작성합니다. 
              {selectedCategory === 'subject-detail' && ` (${selectedSubject} 교과세특 · ${
                selectedLevel === 'advanced' ? '상급 수준' : 
                selectedLevel === 'intermediate' ? '중급 수준' : '기본 수준'
              } 작성 모드)`}
              {selectedCategory === 'activity' && ' (창의적 체험활동 특기사항 작성 모드)'}
              {selectedCategory === 'behavior' && ' (행동특성 및 종합의견 작성 모드)'}
            </span>
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
