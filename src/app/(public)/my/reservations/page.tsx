import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getShopAwareLoginPath } from "@/lib/shopLoginRedirect";
import { safeQuery } from "@/lib/safeDb";
import { formatPrice } from "@/lib/utils";
import { Icon } from "@/components/shared/Icon";

export const dynamic = "force-dynamic";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: "예약 대기", color: "bg-yellow-50 text-yellow-700" },
  CONFIRMED: { label: "예약 확정", color: "bg-blue-50 text-blue-700" },
  COMPLETED: { label: "상담 완료", color: "bg-green-50 text-green-700" },
  CANCELLED: { label: "취소됨", color: "bg-gray-100 text-gray-500" },
  NO_SHOW: { label: "노쇼", color: "bg-red-50 text-red-600" },
};

const FILTER_TABS = [
  { value: "ALL", label: "전체" },
  { value: "PENDING", label: "대기" },
  { value: "CONFIRMED", label: "확정" },
  { value: "COMPLETED", label: "완료" },
  { value: "CANCELLED", label: "취소" },
];

export default async function MyReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }> | { status?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect(getShopAwareLoginPath());

  const { status } = await Promise.resolve(searchParams);
  const statusFilter = status && status !== "ALL" ? status : undefined;

  const reservations = await safeQuery("my reservations list", () =>
    prisma.reservation.findMany({
      where: {
        userId: session.user.id,
        ...(statusFilter ? { status: statusFilter as "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW" } : {}),
      },
      include: {
        seller: {
          select: {
            shopName: true,
            slug: true,
            shopLogo: true,
            user: { select: { name: true, avatar: true } },
          },
        },
        items: true,
        timeSlot: { select: { startTime: true, endTime: true } },
      },
      orderBy: { reservationDate: "desc" },
    }), []);

  const currentStatus = status || "ALL";

  return (
    <div className="animate-fade-in pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/my" className="text-gray-500">
            <Icon name="ArrowRight" size={20} strokeWidth={1.5} className="rotate-180" />
          </Link>
          <h1 className="text-base font-bold text-gray-900">예약 내역</h1>
        </div>
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-1 px-4 py-3 overflow-x-auto scrollbar-hide">
        {FILTER_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/my/reservations?status=${tab.value}`}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              currentStatus === tab.value
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* 목록 */}
      <div className="px-4 space-y-3">
        {reservations.length === 0 ? (
          <div className="text-center py-20">
            <Icon name="Calendar" size={48} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">예약 내역이 없습니다.</p>
          </div>
        ) : (
          reservations.map((r) => {
            const s = STATUS_MAP[r.status] || { label: r.status, color: "bg-gray-100 text-gray-500" };
            const date = new Date(r.reservationDate);
            const dateStr = `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
            const productName = r.items[0]?.productName || "상담 상품";

            return (
              <Link
                key={r.id}
                href={`/my/reservations/${r.id}`}
                className="block bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{r.seller.shopName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{productName}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.color}`}>
                    {s.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                  <span className="flex items-center gap-1">
                    <Icon name="Calendar" size={13} />
                    {dateStr}
                  </span>
                  {r.reservationTime && (
                    <span className="flex items-center gap-1">
                      <Icon name="Clock" size={13} />
                      {r.reservationTime}
                      {r.timeSlot && ` ~ ${r.timeSlot.endTime}`}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                  <span className="text-xs text-gray-400">#{r.reservationNumber}</span>
                  <span className="text-sm font-bold text-gray-800">
                    {formatPrice(Number(r.finalAmount))}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
