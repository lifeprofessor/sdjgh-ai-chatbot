/** @type {import('next').NextConfig} */
const nextConfig = {
  // 이미지 최적화 설정
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
  // 압축 활성화
  compress: true,
  // 프로덕션 최적화
  swcMinify: true,
  // API 라우트는 동적으로 처리
  output: 'standalone',
};

export default nextConfig;
