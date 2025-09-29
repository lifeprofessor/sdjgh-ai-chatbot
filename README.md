# 서대전여자고등학교 교직원 전용 AI 챗봇

서대전여자고등학교 교직원들을 위한 AI 기반 챗봇 애플리케이션입니다. Anthropic Claude API를 활용하여 일반 대화와 학교생활기록부 작성 지원 기능을 제공합니다.

## 🚀 빠른 시작

### 로컬 개발 환경 설정

1. **저장소 클론**
```bash
git clone <repository-url>
cd sdjgh_chatGPT
```

2. **의존성 설치**
```bash
npm install
```

3. **환경 변수 설정**
`.env.example` 파일을 참고하여 `.env.local` 파일 생성:
```bash
cp .env.example .env.local
```

필요한 환경 변수:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase 익명 키
- `SESSION_SECRET`: 세션 암호화 키 (32자 이상)

4. **개발 서버 실행**
```bash
npm run dev
```

http://localhost:3000에서 애플리케이션을 확인할 수 있습니다.

## 📋 주요 기능

- **🔐 사용자 인증**: 교직원 전용 로그인 시스템
- **💬 AI 챗봇**: Anthropic Claude API를 활용한 대화형 AI
- **📝 학교생활기록부 지원**: 전용 프롬프트로 학생 기록 작성 도움
- **🔑 개별 API 키 관리**: 사용자별 API 키 할당 및 관리
- **📊 사용량 추적**: API 사용량 로깅 및 모니터링
- **🔒 보안**: 세션 기반 인증 및 미들웨어 보호

## 🛠️ 기술 스택

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **AI**: Anthropic Claude API
- **Authentication**: 커스텀 세션 기반 인증
- **Deployment**: Vercel

## 📁 프로젝트 구조

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API 라우트
│   │   ├── auth/          # 인증 관련 API
│   │   ├── chat/          # 챗봇 API
│   │   └── usage/         # 사용량 로깅 API
│   ├── login/             # 로그인 페이지
│   ├── change-password/   # 비밀번호 변경 페이지
│   └── page.tsx           # 메인 페이지
├── components/            # React 컴포넌트
├── lib/                   # 유틸리티 라이브러리
├── utils/                 # 헬퍼 함수
├── prompts/              # AI 프롬프트 템플릿
└── scripts/              # 관리 스크립트
```

## 🔧 배포

### Vercel 배포 (권장)

자세한 배포 가이드는 [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)를 참고하세요.

1. **GitHub에 코드 푸시**
2. **Vercel에서 프로젝트 Import**
3. **환경 변수 설정**
4. **배포 실행**

### 환경 변수 (프로덕션)

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SESSION_SECRET=your_session_secret
NODE_ENV=production
```

## 👥 사용자 관리

### 새 사용자 생성

```bash
node src/scripts/create-user.js
```

스크립트를 실행하면 대화형으로 사용자 정보를 입력할 수 있습니다.

### 데이터베이스 스키마

```sql
-- 사용자 테이블
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  api_key TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 사용량 로그 테이블
CREATE TABLE usage_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  user_name VARCHAR(100),
  tokens_used INTEGER,
  model VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔒 보안 고려사항

- **API 키 보안**: 사용자별 개별 API 키 관리
- **세션 관리**: 안전한 세션 기반 인증
- **미들웨어 보호**: 인증되지 않은 접근 차단
- **환경 변수**: 민감한 정보는 환경 변수로 관리

## 📊 모니터링

- **API 사용량**: Supabase 대시보드에서 확인
- **에러 로깅**: Vercel 함수 로그 모니터링
- **성능 지표**: Vercel Analytics 활용

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 서대전여자고등학교 교직원 전용으로 제작되었습니다.

## 📞 지원

문제가 발생하거나 도움이 필요한 경우:

1. **GitHub Issues**: 버그 리포트 및 기능 요청
2. **문서 확인**: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
3. **로그 확인**: Vercel 대시보드의 함수 로그

---

**서대전여자고등학교 교직원 여러분의 업무 효율성 향상을 위해 제작되었습니다.** 🎓✨
