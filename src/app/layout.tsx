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
  title: "사주나라 - 라이브 점사 예약 플랫폼",
  description:
    "방송하는 동안 예약이 알아서 들어옵니다. 유튜브·SNS 사주·신점·타로 상담사를 위한 예약 커머스",
  keywords: ["사주나라", "사주", "신점", "타로", "궁합", "작명", "라이브 상담", "점사 예약"],
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { url: "/favicon.png", sizes: "64x64", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "사주나라 - 라이브 점사 예약 플랫폼",
    description:
      "방송하는 동안 예약이 알아서 들어옵니다. 유튜브·SNS 사주·신점·타로 상담사를 위한 예약 커머스",
    url: "/",
    siteName: "사주나라",
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "사주나라 - 라이브 점사 예약 플랫폼",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "사주나라 - 라이브 점사 예약 플랫폼",
    description:
      "방송하는 동안 예약이 알아서 들어옵니다. 유튜브·SNS 사주·신점·타로 상담사를 위한 예약 커머스",
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
      images: [{ url: imageUrl, width: 1200, height: 630, alt: "사주나라 - 라이브 점사 예약 플랫폼", type: "image/png" }],
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
