import ChatInterface from '@/components/ChatInterface'
import UserStatus from '@/components/UserStatus'

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <div className="w-full h-screen flex flex-col">
        {/* 사용자 상태 및 API 키 정보 */}
        <UserStatus />
        
        {/* 채팅 인터페이스 */}
        <div className="flex-1">
          <ChatInterface />
        </div>
      </div>
    </main>
  )
}
