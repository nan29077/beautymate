"use client";

import { useShopChrome } from "@/components/shared/ShopChromeProvider";
import SellerShopHeader from "@/components/shared/SellerShopHeader";
import SellerShopBottomNav from "@/components/shared/SellerShopBottomNav";

// 상담사 서브페이지(/cart, /my/* ...)에서 상담사 전용 상단 헤더를 렌더한다.
// 상담사 컨텍스트가 없거나 일반 경로면 아무것도 렌더하지 않는다(공통 Header 가 그대로 노출됨).
export function ShopSubpageHeader() {
  const { shop, subpageActive } = useShopChrome();
  if (!subpageActive || !shop) return null;
  return <SellerShopHeader sellerName={shop.name} sellerLogo={shop.logo} sellerSlug={shop.slug} />;
}

// 상담사 서브페이지에서 상담사 전용 하단 네비를 렌더한다(공통 MobileNav 는 숨겨짐).
export function ShopSubpageBottomNav() {
  const { shop, subpageActive } = useShopChrome();
  if (!subpageActive || !shop) return null;
  return <SellerShopBottomNav sellerSlug={shop.slug} />;
}
