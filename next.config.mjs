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
  // 실험적 기능 (성능 향상)
  experimental: {
    optimizeCss: true,
  },
};

export default nextConfig;
