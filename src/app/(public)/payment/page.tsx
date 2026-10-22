import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { dashboardPathForRole } from "@/lib/buyerGuard";
import { getShopAwareLoginPath } from "@/lib/shopLoginRedirect";
import PaymentMockClient from "@/components/payment/PaymentMockClient";

// 결제(가상계좌 입금 · 상품권 결제) — 목업 화면.
// 실제 PG·DB 연동 없음. 화면 동작만 시뮬레이션한다 (src/lib/paymentMock.ts 참고).

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "결제 | 뷰티메이트",
  robots: { index: false, follow: false },
};

export default async function PaymentPage() {
  // 고객 전용: 비로그인 → 로그인 후 이 페이지로 복귀, 관리자·뷰티 전문가 → 본인 대시보드
  // (requireBuyerSession 과 동일한 규칙이지만 로그인 후 /payment 로 돌아오도록 callbackUrl 을 넘긴다.
  //  단, 뷰티샵 쿠키가 있으면 기존 규칙대로 그 뷰티샵 전용 로그인으로 보내며 로그인 후 뷰티샵으로 돌아간다)
  const session = await auth();
  if (!session?.user) redirect(getShopAwareLoginPath("/payment"));
  const dash = dashboardPathForRole(session.user.role);
  if (dash) redirect(dash);

  return <PaymentMockClient />;
}
