import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '서대전여자고등학교 교직원 전용 AI',
  description: '서대전여자고등학교 교직원 전용 AI와 대화할 수 있는 챗봇 애플리케이션',
  icons: {
    icon: '/sdjgh_logo.png',
    shortcut: '/sdjgh_logo.png',
    apple: '/sdjgh_logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
