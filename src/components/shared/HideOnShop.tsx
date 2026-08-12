"use client";

import { usePathname } from "next/navigation";

// 점집(/shop/[slug]) 안에서는 공통 크롬(글로벌 푸터/플로팅 등)을 숨겨
// "상담사 세계" 안에만 머물게 한다. 서버 컴포넌트도 children 으로 받아 감출 수 있다.
export default function HideOnShop({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  if (/^\/shop\/[^/]+/.test(pathname)) return null;
  return <>{children}</>;
}
