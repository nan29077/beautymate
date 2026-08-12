import { redirect } from "next/navigation";

// 주문 관리는 예약 관리로 통합되었다. (커머스 시절 잔재 라우트 — 링크 호환용 redirect만 유지)
export default async function SellerOrdersPage() {
  redirect("/seller/reservations");
}
