import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const session = request.cookies.get('session')
  const { pathname } = request.nextUrl

  // 로그인 페이지와 비밀번호 변경 페이지는 인증이 필요 없음
  if (pathname === '/login' || pathname === '/change-password') {
    // 이미 로그인된 사용자가 로그인 페이지에 접근하면 홈으로 리다이렉트
    if (session && pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  // API 라우트는 미들웨어에서 처리하지 않음 (API 자체에서 인증 처리)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // 정적 파일들은 인증이 필요 없음
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // 세션이 없으면 로그인 페이지로 리다이렉트
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
