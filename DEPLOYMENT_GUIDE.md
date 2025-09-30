# Vercel 무료 배포 가이드

## 📋 프로젝트 개요
서대전여자고등학교 교직원 전용 AI 챗봇 애플리케이션을 Vercel에 무료로 배포하는 가이드입니다.

## 🛠️ 사전 준비사항

### 1. Supabase 데이터베이스 설정
1. [Supabase](https://supabase.com)에서 무료 계정 생성
2. 새 프로젝트 생성
3. SQL Editor에서 다음 테이블 생성:

```sql
-- 사용자 테이블 생성
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  api_key TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 사용량 로그 테이블 생성 (선택사항)
CREATE TABLE usage_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  user_name VARCHAR(100),
  tokens_used INTEGER,
  model VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX idx_users_name ON users(name);
CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at);
```

4. Settings > API에서 Project URL과 anon public key 복사

### 2. 사용자 계정 생성
프로젝트 루트에서 다음 명령어로 사용자 생성:

```bash
node src/scripts/create-user.js
```

## 🚀 Vercel 배포 단계

### 1. GitHub 저장소 준비
```bash
# Git 초기화 (아직 안했다면)
git init
git add .
git commit -m "Initial commit"

# GitHub에 저장소 생성 후
git remote add origin https://github.com/your-username/your-repo-name.git
git push -u origin main
```

### 2. Vercel 계정 설정
1. [Vercel](https://vercel.com)에서 GitHub 계정으로 로그인
2. "New Project" 클릭
3. GitHub 저장소 선택 및 Import

### 3. 환경 변수 설정
Vercel 프로젝트 설정에서 다음 환경 변수 추가:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SESSION_SECRET=your_32_character_or_longer_secret_key
NODE_ENV=production
```

**중요**: SESSION_SECRET은 32자 이상의 랜덤 문자열이어야 합니다.
생성 예시: `openssl rand -base64 32`

### 4. 배포 설정
- Framework Preset: Next.js
- Root Directory: ./
- Build Command: `npm run build` (기본값)
- Output Directory: `.next` (기본값)

### 5. 배포 실행
"Deploy" 버튼 클릭하여 배포 시작

## 🔧 무료 플랜 제한사항 및 최적화

### Vercel 무료 플랜 제한
- **대역폭**: 100GB/월
- **함수 실행 시간**: 60초 (Hobby 플랜)
- **함수 호출**: 100,000회/월
- **빌드 시간**: 6,000분/월

### Supabase 무료 플랜 제한
- **데이터베이스 크기**: 500MB
- **대역폭**: 5GB/월
- **API 요청**: 50,000회/월

### 최적화 방법

#### 1. API 응답 최적화
```typescript
// src/app/api/chat/route.ts에서 스트리밍 응답 사용 (이미 구현됨)
// 긴 응답을 청크 단위로 전송하여 함수 실행 시간 단축
```

#### 2. 이미지 최적화
```javascript
// next.config.mjs 업데이트
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
  compress: true,
};

export default nextConfig;
```

#### 3. 캐싱 전략
```typescript
// 정적 파일 캐싱 설정 (vercel.json에 추가)
{
  "headers": [
    {
      "source": "/public/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

## 📊 모니터링 및 관리

### 1. Vercel 대시보드에서 확인 가능한 지표
- 함수 호출 횟수
- 대역폭 사용량
- 빌드 시간
- 에러 로그

### 2. Supabase 대시보드에서 확인 가능한 지표
- 데이터베이스 크기
- API 요청 수
- 활성 연결 수

### 3. 사용량 최적화 팁
- 불필요한 API 호출 최소화
- 이미지 파일 크기 최적화
- 데이터베이스 쿼리 최적화
- 캐싱 활용

## 🔒 보안 설정

### 1. 환경 변수 보안
- API 키는 절대 클라이언트 사이드에 노출하지 않기
- SESSION_SECRET은 충분히 복잡하게 설정
- Supabase RLS(Row Level Security) 활용

### 2. 도메인 설정
Vercel에서 커스텀 도메인 설정 가능 (무료 플랜에서도 지원)

## 🆘 문제 해결

### 자주 발생하는 문제들

#### 1. 빌드 실패
```bash
# 로컬에서 빌드 테스트
npm run build
```

#### 2. 환경 변수 오류
- Vercel 대시보드에서 환경 변수 재확인
- 변수명 오타 확인
- 재배포 실행

#### 3. 데이터베이스 연결 오류
- Supabase URL과 키 재확인
- Supabase 프로젝트 상태 확인

#### 4. API 키 관련 오류
- Anthropic API 키 유효성 확인
- API 키 형식 확인 (sk-ant-로 시작)

## 📞 지원

문제가 발생하면 다음을 확인하세요:
1. Vercel 함수 로그
2. Supabase 로그
3. 브라우저 개발자 도구 콘솔
4. 네트워크 탭에서 API 요청 상태

## 🎯 배포 후 확인사항

1. ✅ 로그인 기능 정상 작동
2. ✅ AI 챗봇 응답 정상
3. ✅ 비밀번호 변경 기능
4. ✅ 사용자 세션 관리
5. ✅ API 키 검증 기능
6. ✅ 학교생활기록부 모드 작동

배포가 완료되면 제공된 Vercel URL로 접속하여 모든 기능이 정상 작동하는지 확인하세요!
