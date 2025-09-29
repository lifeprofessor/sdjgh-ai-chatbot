import bcrypt from 'bcryptjs'
import { supabase, User } from './supabase'

// 사용자 로그인 함수
export async function authenticateUser(name: string, password: string): Promise<User | null> {
  try {
    // 데이터베이스에서 사용자 조회
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('name', name)
      .single()

    if (error || !data) {
      console.error('사용자를 찾을 수 없습니다:', error)
      return null
    }

    // 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(password, data.password)
    
    if (!isPasswordValid) {
      console.error('비밀번호가 일치하지 않습니다')
      return null
    }

    return data as User
  } catch (error) {
    console.error('인증 중 오류 발생:', error)
    return null
  }
}

// 비밀번호 변경 함수
export async function changePassword(name: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  try {
    // 먼저 사용자 인증 확인
    const user = await authenticateUser(name, currentPassword)
    
    if (!user) {
      return {
        success: false,
        message: '사용자명 또는 현재 비밀번호가 올바르지 않습니다.'
      }
    }

    // 새 비밀번호 해싱
    const hashedNewPassword = await bcrypt.hash(newPassword, 10)

    // 데이터베이스에서 비밀번호 업데이트 - name으로 업데이트 (name은 unique하므로 안전)
    const { error } = await supabase
      .from('users')
      .update({ password: hashedNewPassword })
      .eq('name', name)

    if (error) {
      console.error('비밀번호 변경 중 오류 발생:', error)
      return {
        success: false,
        message: '비밀번호 변경 중 오류가 발생했습니다.'
      }
    }

    return {
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다.'
    }
  } catch (error) {
    console.error('비밀번호 변경 중 오류 발생:', error)
    return {
      success: false,
      message: '서버 오류가 발생했습니다.'
    }
  }
}

// 새 사용자 등록 함수 (필요시 사용)
export async function createUser(name: string, password: string, apiKey: string): Promise<User | null> {
  try {
    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10)

    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          name,
          password: hashedPassword,
          api_key: apiKey,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('사용자 생성 중 오류 발생:', error)
      return null
    }

    return data as User
  } catch (error) {
    console.error('사용자 생성 중 오류 발생:', error)
    return null
  }
}
