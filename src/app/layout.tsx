import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import Providers from "@/components/shared/Providers";
import NavigationProgress from "@/components/shared/NavigationProgress";
import { getFeatureFlags } from "@/lib/settings";
import ThemeEffect from "@/components/shared/ThemeEffect";
import { prisma } from "@/lib/prisma";
import { getShareBaseUrl, toAbsoluteShareUrl } from "@/lib/shareMetadata";

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const baseMetadata: Metadata = {
  title: "뷰티메이트 - 나에게 맞는 뷰티 전문가를 만나는 곳",
  description:
    "스킨케어, 메이크업, 헤어, 네일, 퍼스널 컬러까지 검증된 뷰티 전문가를 발견하고 라이브로 소통하며 간편하게 예약하세요.",
  keywords: ["뷰티메이트", "뷰티 전문가", "뷰티샵", "스킨케어", "메이크업", "헤어", "네일", "퍼스널 컬러", "뷰티 예약"],
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", sizes: "64x64", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "뷰티메이트 - 나에게 맞는 뷰티 전문가를 만나는 곳",
    description:
      "검증된 뷰티 전문가를 발견하고 라이브로 소통하며 간편하게 예약하세요.",
    url: "/",
    siteName: "뷰티메이트",
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "뷰티메이트 - 나에게 맞는 뷰티 전문가를 만나는 곳",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "뷰티메이트 - 나에게 맞는 뷰티 전문가를 만나는 곳",
    description:
      "검증된 뷰티 전문가를 발견하고 라이브로 소통하며 간편하게 예약하세요.",
    images: ["/og-image.png"],
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const metaBaseUrl = getShareBaseUrl();
  const pageUrl = metaBaseUrl.toString();
  const imageUrl = toAbsoluteShareUrl("/og-image.png", metaBaseUrl);
  const withBase: Metadata = {
    ...baseMetadata,
    metadataBase: metaBaseUrl,
    alternates: { canonical: pageUrl },
    openGraph: {
      ...baseMetadata.openGraph,
      url: pageUrl,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: "뷰티메이트 - 나에게 맞는 뷰티 전문가를 만나는 곳", type: "image/png" }],
    },
    twitter: {
      ...baseMetadata.twitter,
      images: [imageUrl],
    },
  };

  let customFavicon = "";
  try {
    const row = await prisma.setting.findUnique({ where: { key: "site.faviconUrl" }, select: { value: true } });
    customFavicon = row?.value?.trim() || "";
  } catch {
    // 설정 조회 실패 시 코드에 포함된 초승달 파비콘을 사용한다.
  }

  if (!customFavicon) return withBase;

  return {
    ...withBase,
    icons: {
      icon: [
        { url: customFavicon },
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/favicon.ico", type: "image/x-icon" },
      ],
      apple: customFavicon,
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const flags = await getFeatureFlags();
  return (
    <html lang="ko">
      <body className="min-h-screen">
        <Providers flags={flags}>
          <ThemeEffect flags={flags} />
          <Suspense fallback={null}>
            <NavigationProgress />
          </Suspense>
          {children}
        </Providers>
      </body>
    </html>
  );
}
