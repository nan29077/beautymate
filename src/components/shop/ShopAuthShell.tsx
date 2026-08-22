"use client";

// 뷰티샵 독립 인증 화면 공용 셸 — 뷰티샵 브랜딩(로고+이름) 헤더
import Link from "next/link";
import SafeImage from "@/components/shared/SafeImage";
import { pickBeautyMateAvatar } from "@/lib/defaults";

export default function ShopAuthShell({
  shop,
  title,
  subtitle,
  children,
}: {
  shop: { slug: string; shopName: string; shopLogo: string | null; id: string };
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-shrink-0 pt-12 pb-6 text-center">
        <Link href={`/shop/${shop.slug}`} className="inline-flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-white ring-2 ring-amber-200 shadow-sm">
            <SafeImage
              src={shop.shopLogo}
              placeholder={pickBeautyMateAvatar(shop.id)}
              alt={shop.shopName}
              width={64}
              height={64}
              fallbackText={shop.shopName.charAt(0)}
            />
          </div>
          <span className="text-lg font-bold text-gray-900">{shop.shopName}</span>
        </Link>
        <h1 className="mt-3 text-base font-semibold text-gray-700">{title}</h1>
        {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
      </div>
      <div className="flex-1 px-5 pb-10 max-w-md mx-auto w-full">{children}</div>
    </div>
  );
}
