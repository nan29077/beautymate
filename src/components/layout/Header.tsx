"use client";

import BrandWordmark from "@/components/shared/BrandWordmark";
import { Icon } from '@/components/shared/Icon';
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useSearchParams } from "next/navigation";
import { useShopChrome } from "@/components/shared/ShopChromeProvider";
import { useFeatureFlags } from "@/components/shared/FeatureFlagsProvider";
import NotificationBell from "@/components/shared/NotificationBell";

export default function Header() {
  const { data: session, status } = useSession();
  const flags = useFeatureFlags();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  // 라이브 팝업(iframe, ?embedded=true) 또는 라이브 진입(?from=live) 시 상단 헤더 숨김
  const embedded = searchParams?.get("embedded") === "true" || searchParams?.get("from") === "live";

  const loggedOut = !session && status !== "loading";

  // 뷰티샵 안에서는 글로벌 헤더를 숨기고 뷰티샵 전용 헤더(SellerShopHeader)만 노출한다.
  const isSellerShop = /^\/shop\/[^/]+/.test(pathname);
  const isHome = pathname === "/";
  // 뷰티 전문가 서브페이지(장바구니/내정보 등)에서는 공통 헤더 대신 뷰티 전문가 전용 헤더가 노출된다.
  const { subpageActive } = useShopChrome();

  if (isSellerShop || subpageActive || embedded) return null;

  return (
    <>
    <header className={`sticky top-0 z-[60] ${isHome ? "lg:hidden" : ""}`}>
      <div className="bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/" prefetch={true} className="flex items-center gap-1.5">
            <BrandWordmark size="md" />
          </Link>

          <div className="flex items-center gap-0.5 relative z-[70]" style={{ pointerEvents: "auto" }}>
            {/* 뷰티 전문가 찾기 — 예약 커머스의 핵심 진입점.
                '뷰티 전문가 탐색' 기능이 꺼져 있으면 /sellers 가 404이므로 버튼도 숨긴다. */}
            {flags.seller && (
              <Link
                href="/sellers"
                prefetch={true}
                aria-label="뷰티 전문가 찾기"
                title="뷰티 전문가 찾기"
                className="inline-flex items-center justify-center h-10 px-2 text-gray-900 hover:opacity-60 transition-opacity"
              >
                <Icon name="Search" size={22} strokeWidth={1.5} />
              </Link>
            )}
            {loggedOut ? (
              /* 로그아웃 상태: 로그인 버튼 */
              <Link
                href="/auth/login"
                prefetch={true}
                className="inline-flex items-center justify-center gap-1 text-[13px] font-bold text-gray-900 h-10 px-2 ml-1 active:scale-95 transition-transform"
              >
                <Icon name="Login" size={22} /> 로그인
              </Link>
            ) : (
              /* 로그인 상태: 알림 버튼 + 로그아웃 버튼 */
              <>
                <NotificationBell size={22} buttonClassName="inline-flex items-center justify-center h-10 px-2" />
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="inline-flex items-center justify-center gap-1 text-[13px] font-bold text-gray-900 h-10 px-2 ml-1 active:scale-95 transition-transform"
                  aria-label="로그아웃"
                >
                  <Icon name="Logout" size={22} /> 로그아웃
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
    {isHome && (
      <header className="sticky top-0 z-[60] hidden border-b border-rose-100/80 bg-white/95 backdrop-blur-xl lg:block">
        <div className="mx-auto flex h-[76px] max-w-[1320px] items-center justify-between px-8">
          <Link href="/" prefetch className="flex items-center">
            <BrandWordmark size="lg" />
          </Link>
          <nav className="flex items-center gap-9 text-sm font-bold text-gray-700" aria-label="PC 메인 메뉴">
            {flags.seller && <Link href="/sellers" className="transition hover:text-[#b44b68]">뷰티 전문가</Link>}
            <Link href="/#experts" className="transition hover:text-[#b44b68]">추천 전문가</Link>
            {flags.liveCommerce && <Link href="/live" className="flex items-center gap-1.5 transition hover:text-[#b44b68]"><span className="h-2 w-2 rounded-full bg-red-500" /> 라이브</Link>}
            <Link href="/#about" className="transition hover:text-[#b44b68]">뷰티메이트 소개</Link>
            <Link href="/#how" className="transition hover:text-[#b44b68]">이용방법</Link>
            <Link href="/become-seller" className="transition hover:text-[#b44b68]">전문가 입점</Link>
          </nav>
          <div className="flex items-center gap-2">
            {flags.seller && <Link href="/sellers" aria-label="검색" className="flex h-10 w-10 items-center justify-center rounded-full text-gray-700 transition hover:bg-rose-50 hover:text-[#b44b68]"><Icon name="Search" size={20} /></Link>}
            {loggedOut ? (
              <>
                <Link href="/auth/login" className="px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:text-[#b44b68]">로그인</Link>
                <Link href="/auth/register" className="rounded-full bg-[#6d2945] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#4f1d32]">회원가입</Link>
              </>
            ) : (
              <>
                <NotificationBell size={20} buttonClassName="flex h-10 w-10 items-center justify-center rounded-full hover:bg-rose-50" />
                <Link href="/my" className="rounded-full bg-[#6d2945] px-5 py-2.5 text-sm font-bold text-white">마이페이지</Link>
                <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="px-3 py-2 text-xs font-bold text-gray-500">로그아웃</button>
              </>
            )}
          </div>
        </div>
      </header>
    )}
    </>
  );
}
