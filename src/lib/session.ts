import { cookies } from 'next/headers'
import { User } from './supabase'

export interface SessionUser {
  id: number
  name: string
  api_key: string
}

// 세션 생성
export function createSession(user: User) {
  const sessionData: SessionUser = {
    id: user.id,
    name: user.name,
    api_key: user.api_key,
  }
  
  const cookieStore = cookies()
  cookieStore.set('session', JSON.stringify(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7일
    path: '/',
  })
}

// 세션 가져오기
export function getSession(): SessionUser | null {
  try {
    const cookieStore = cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return null
    }
    
    return JSON.parse(sessionCookie.value) as SessionUser
  } catch (error) {
    console.error('세션 파싱 오류:', error)
    return null
  }
}

// 세션 삭제
export function deleteSession() {
  const cookieStore = cookies()
  cookieStore.delete('session')
}

// 인증 확인
export function isAuthenticated(): boolean {
  const session = getSession()
  return session !== null
}
