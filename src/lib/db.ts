import { neon } from '@neondatabase/serverless'

// Neon 데이터베이스 연결
const sql = neon(process.env.DATABASE_URL!)

export { sql }

// 사용자 타입 정의
export interface User {
  id: number
  name: string
  password: string
  api_key: string
  created_at: string
}
