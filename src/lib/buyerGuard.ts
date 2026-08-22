import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getShopAwareLoginPath } from "@/lib/shopLoginRedirect";
import type { Session } from "next-auth";

// 역할별 대시보드 경로 (고객은 대시보드 없음 → null)
export function dashboardPathForRole(role?: string | null): string | null {
  switch (role) {
    case "SUPER_ADMIN":
      return "/admin";
    case "CONSULTANT":
      return "/seller";
    default:
      return null;
  }
}

// 고객 전용(/my/*) 페이지 가드.
// - 비로그인 → 로그인 페이지
// - 비고객(관리자/뷰티 전문가) → 즉시 역할 대시보드로 서버 리다이렉트
//   (고객 마이페이지 내용이 잠깐이라도 렌더되지 않도록, 데이터 조회 이전에 호출)
export async function requireBuyerSession(): Promise<Session> {
  const session = await auth();
  if (!session?.user) redirect(getShopAwareLoginPath());
  const dash = dashboardPathForRole(session.user.role);
  if (dash) redirect(dash);
  return session;
}
