"use client";

import { useEffect } from "react";
import { SB_SHOP_COOKIE, type ShopMini } from "@/lib/shopContext";

// 점집 메인(/shop/[slug]) 진입 시 상담사 미니정보를 쿠키에 저장한다.
// 이후 고객 서브페이지(/cart, /my/*, /products/* ...)에서도 상담사 전용 헤더·하단바가 유지된다.
export default function ShopContextSync({ shop }: { shop: ShopMini }) {
  useEffect(() => {
    const value = encodeURIComponent(JSON.stringify(shop));
    // 30일 유지, lax (상담사 세계 내 이동 유지용)
    document.cookie = `${SB_SHOP_COOKIE}=${value}; path=/; max-age=2592000; samesite=lax`;
  }, [shop.slug, shop.name, shop.logo]);

  return null;
}
