import { Icon } from "@/components/shared/Icon";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getShopAwareLoginPath } from "@/lib/shopLoginRedirect";
import { formatPrice } from "@/lib/utils";
import { safeQuery } from "@/lib/safeDb";

export const dynamic = "force-dynamic";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: "결제대기", color: "bg-gray-100 text-gray-600" },
  PAID: { label: "결제완료", color: "bg-blue-50 text-blue-600" },
  CONFIRMED: { label: "확인됨", color: "bg-indigo-50 text-indigo-600" },
  SHIPPING: { label: "상담 진행중", color: "bg-cyan-50 text-cyan-600" },
  DELIVERED: { label: "서비스 완료", color: "bg-green-50 text-green-600" },
  COMPLETED: { label: "서비스 완료", color: "bg-green-50 text-green-600" },
  NO_SHOW: { label: "노쇼", color: "bg-red-50 text-red-500" },
  CANCELLED: { label: "취소됨", color: "bg-red-50 text-red-600" },
  REFUND_REQUESTED: {
    label: "환불요청",
    color: "bg-orange-50 text-orange-600",
  },
  REFUNDED: { label: "환불완료", color: "bg-gray-100 text-gray-500" },
};

// 결제취소 진행 단계(reservations.cancelStatus) → 배지.
// 뷰티 전문가가 취소를 요청하고 관리자가 승인하기까지의 중간 상태를 고객에게 보여준다.
const CANCEL_STAGE_MAP: Record<string, { label: string; color: string }> = {
  REQUESTED: { label: "결제취소 요청중", color: "bg-amber-50 text-amber-700" },
  DEPOSIT_CONFIRMED: {
    label: "결제취소 확인중",
    color: "bg-amber-50 text-amber-700",
  },
  APPROVED: { label: "결제취소 승인", color: "bg-gray-100 text-gray-500" },
  COMPLETED: { label: "결제취소 완료", color: "bg-gray-100 text-gray-500" },
};

// 예약내역은 역할과 무관하게 모든 로그인 사용자가 본인 구매 내역을 볼 수 있어야 함
export default async function MyOrdersPage() {
  const session = await auth();
  if (!session?.user) redirect(getShopAwareLoginPath());

  // 운영 DB에 reservations 테이블이 아직 없을 수 있어(P2021) safeQuery 폴백 적용
  const orders = await safeQuery(
    "my orders list",
    () =>
      prisma.reservation.findMany({
        where: { userId: session.user!.id },
        include: {
          seller: true,
          items: {
            include: { variant: true },
          },
          campaign: { select: { title: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    [],
  );

  return (
    <div className="animate-fade-in pb-4">
      <div className="sticky top-12 z-30 bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/my" className="text-gray-500 hover:text-gray-900">
            <Icon
              name="ArrowRight"
              size={20}
              strokeWidth={1.5}
              className="rotate-180"
            />
          </Link>
          <h1 className="text-base font-bold text-gray-900">예약 내역</h1>
        </div>
      </div>

      <div className="px-4 pt-4">
        {orders.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Icon
              name="Package"
              size={48}
              strokeWidth={1.5}
              className="mx-auto mb-3 opacity-30"
            />
            <p className="text-sm">예약 내역이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const isCancelledOrRefunded = [
                "CANCELLED",
                "REFUNDED",
                "REFUND_REQUESTED",
              ].includes(order.status);
              const status = STATUS_MAP[order.status] || {
                label: order.status,
                color: "bg-gray-100 text-gray-600",
              };
              // 진행 상태 배지는 reservations 에 실제로 존재하는 컬럼에서만 도출한다.
              // (예전에는 스키마에 없는 deliveryStatus 를 읽어 항상 undefined 였고,
              //  이를 기록하려던 결제/취소 API 는 Unknown column 으로 실패했다.)
              // 우선순위: 결제취소 진행 상태(cancelStatus) > 예약 상태(status)
              // 결제가 실제로 이루어진 예약(결제완료 또는 환불완료)만 취소 단계를 배지로 쓴다.
              // 미결제 예약에는 애초에 cancelStatus 가 붙지 않는다.
              const isSettled =
                order.paymentStatus === "COMPLETED" || order.paymentStatus === "REFUNDED";
              const cancelStage = isSettled
                ? CANCEL_STAGE_MAP[order.cancelStatus ?? ""]
                : undefined;
              // 취소 요청 배지는 아직 취소가 확정되지 않은 예약에서만 status 를 덮어쓴다.
              const badge =
                cancelStage && (!isCancelledOrRefunded || order.cancelStatus === "COMPLETED")
                  ? cancelStage
                  : status;
              return (
                <Link
                  key={order.id}
                  href={`/my/orders/${order.id}`}
                  className="block bg-white rounded-xl border border-gray-100 overflow-hidden active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <div className="min-w-0 flex-1 pr-2">
                      {/* 뷰티 서비스명을 크게 강조, 예약번호·날짜는 작게 */}
                      <p className="text-[14px] font-bold text-gray-900 truncate">
                        {order.items[0]?.productName || "예약 뷰티 서비스"}
                        {order.items.length > 1 && (
                          <span className="text-[11px] font-normal text-gray-400">
                            {" "}
                            외 {order.items.length - 1}건
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(order.createdAt).toLocaleDateString("ko-KR")}{" "}
                        · 예약 {order.reservationNumber}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-medium px-2 py-1 rounded-full flex-shrink-0 ${badge.color}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="text-[11px] text-gray-400 mb-2">
                      {order.seller.shopName}
                    </p>
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 py-1.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-800 truncate">
                            {item.productName}
                          </p>
                          {item.variantName && (
                            <p className="text-[11px] text-gray-400 truncate">
                              {item.variantName}
                            </p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-medium">
                            {formatPrice(Number(item.totalPrice))}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {item.quantity}개
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
