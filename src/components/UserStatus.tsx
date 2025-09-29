'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface UserInfo {
  id: number
  name: string
  api_key: string
}

export default function UserStatus() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [apiKeyStatus, setApiKeyStatus] = useState<{
    isValid: boolean
    error?: string
    isChecking: boolean
  }>({ isValid: false, isChecking: true })
  const router = useRouter()

  useEffect(() => {
    checkSession()
  }, [])

  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/session')
      const result = await response.json()
      
      if (response.ok) {
        setUserInfo(result.user)
        await checkApiKey()
      } else {
        router.push('/login')
      }
    } catch (error) {
      console.error('세션 확인 오류:', error)
      router.push('/login')
    }
  }

  const checkApiKey = async () => {
    try {
      setApiKeyStatus(prev => ({ ...prev, isChecking: true }))
      
      const response = await fetch('/api/auth/validate-api-key', {
        method: 'POST'
      })
      const result = await response.json()
      
      setApiKeyStatus({
        isValid: result.isValid,
        error: result.error,
        isChecking: false
      })
    } catch (error) {
      console.error('API 키 검증 오류:', error)
      setApiKeyStatus({
        isValid: false,
        error: 'API 키 검증 중 오류가 발생했습니다.',
        isChecking: false
      })
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('로그아웃 오류:', error)
    }
  }

  if (!userInfo) {
    return null
  }

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2">
      <div className="max-w-3xl mx-auto flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">사용자:</span>
            <span className="font-medium text-gray-900">{userInfo.name}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">API 키:</span>
            {apiKeyStatus.isChecking ? (
              <span className="text-yellow-600">확인 중...</span>
            ) : apiKeyStatus.isValid ? (
              <span className="text-green-600 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                유효함
              </span>
            ) : (
              <span className="text-red-600 flex items-center" title={apiKeyStatus.error}>
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                오류
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={checkApiKey}
            disabled={apiKeyStatus.isChecking}
            className="text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
          >
            API 키 재확인
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={handleLogout}
            className="text-red-600 hover:text-red-800 font-medium"
          >
            로그아웃
          </button>
        </div>
      </div>
      
      {!apiKeyStatus.isValid && !apiKeyStatus.isChecking && (
        <div className="max-w-3xl mx-auto mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
          ⚠️ API 키 문제: {apiKeyStatus.error}
        </div>
      )}
    </div>
  )
}
