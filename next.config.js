/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/og-image.png",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400" },
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
    ];
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
    unoptimized: true,
    minimumCacheTTL: 86400,
  },
  // 빌드 안전망 — 타입 오류·ESLint 오류가 있으면 빌드를 실패시킨다.
  // (예전에는 둘 다 무시하도록 켜 두어, 스키마에 없는 컬럼 참조 같은 오류가
  //  빌드를 통과해 운영에서야 500 으로 드러났다. ESLint 설정은 .eslintrc.json 참고)
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  allowedDevOrigins: [
    "*.sandbox.novita.ai",
    "*.sandbox.gensparksite.com",
    "*.e2b.dev",
  ],
  // output file tracing 비활성화.
  // @vercel/nft 가 Prisma 런타임의 동적 경로를 추적하면서 사용자 홈 디렉터리 전체를 glob 하는데,
  // Windows 의 레거시 정션(Application Data, Cookies 등)에서 EPERM 이 나 빌드가 실패한다.
  // 이 앱은 output: "standalone" 을 쓰지 않으므로 트레이싱 결과물이 필요 없다.
  outputFileTracing: false,
  poweredByHeader: false,
  compress: true,
  reactStrictMode: false,
  experimental: {
    optimizePackageImports: ["date-fns", "@prisma/client"],
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

module.exports = nextConfig;
