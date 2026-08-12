import { Icon } from '@/components/shared/Icon';
import { redirect } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFeatureFlags } from "@/lib/settings";
import { safeQuery } from "@/lib/safeDb";
import { formatPrice } from "@/lib/utils";
import { DEFAULT_PRODUCT_IMAGE } from "@/lib/defaults";
import SafeImage from "@/components/shared/SafeImage";
import ShopLinkButton from "@/components/shared/ShopLinkButton";
import HexNumBadge from "@/components/shared/HexNumBadge";
import SellerLiveCodeCard from "@/components/shared/SellerLiveCodeCard";

export const dynamic = "force-dynamic";

export default async function SellerDashboard() {
    const { beeDecoration: SHOW_BEES } = await getFeatureFlags();
  const session = await auth();
  if (!session) redirect("/auth/login");
  if (session.user?.role !== "CONSULTANT") redirect("/");

  const seller = await prisma.sellerProfile.findUnique({
    where: { userId: session!.user!.id },
    include: {
      campaigns: {
        where: { status: "ACTIVE" },
        include: { product: true },
        orderBy: { endDate: "asc" },
      },
      // reservations 는 운영 DB 미반영 가능성이 있어 _count 에서 제외하고 별도 safeQuery 로 센다
      _count: {
        select: { fans: true, shopProducts: true, campaigns: true },
      },
    },
  });

  if (!seller) redirect("/");

  const totalReservationCount = await safeQuery(
    "seller dashboard reservation count",
    () => prisma.reservation.count({ where: { sellerId: seller.id } }),
    0,
  );

  // 기간 경계 (오늘/이번주(월요일 시작)/이번달)
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - ((todayStart.getDay() + 6) % 7)); // 월요일 시작
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // 오늘(한국 시간 기준) 날짜 문자열. 예약일/슬롯 날짜는 "YYYY-MM-DD"를 UTC 자정으로 저장하므로
  // 서버 타임존과 무관하게 KST 달력 날짜로 경계를 잡는다.
  const todayStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const dayStartUtc = new Date(todayStr + "T00:00:00.000Z");
  const dayEndUtc = new Date(todayStr + "T23:59:59.999Z");

  const [allOrders, recentOrders, recentReviews, topProducts, pendingOrders] = await Promise.all([
    // 예약 수/매출 집계용 (실데이터 기반)
    safeQuery("seller dashboard allOrders", () =>
      prisma.reservation.findMany({
        where: { sellerId: seller.id },
        select: { createdAt: true, paidAt: true, finalAmount: true, paymentStatus: true, status: true },
      }), []),
    safeQuery("seller dashboard recentOrders", () =>
      prisma.reservation.findMany({
        where: { sellerId: seller.id },
        include: { user: { select: { name: true } }, items: { select: { productName: true } } },
        orderBy: { createdAt: "desc" },
        take: 6,
      }), []),
    prisma.review.findMany({
      where: { product: { sellerProducts: { some: { sellerId: seller.id } } } },
      include: { user: { select: { name: true } }, product: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.sellerShopProduct.findMany({
      where: { sellerId: seller.id, isActive: true },
      include: { product: { select: { name: true, thumbnail: true, basePrice: true, soldCount: true } } },
      orderBy: { product: { soldCount: "desc" } },
      take: 5,
    }),
    safeQuery("seller dashboard pendingOrders", () =>
      prisma.reservation.count({ where: { sellerId: seller.id, status: "PENDING" } }), 0),
  ]);

  // ── 오늘의 예약 현황 & 이번 달 실적 ─────────────────────────────
  const [todayReservations, todaySlots, monthCompletedCount] = await Promise.all([
    safeQuery("seller dashboard todayReservations", () =>
      prisma.reservation.findMany({
        where: {
          sellerId: seller.id,
          reservationDate: { gte: dayStartUtc, lte: dayEndUtc },
          status: { not: "CANCELLED" },
        },
        select: { status: true, reservationTime: true, customerName: true },
        orderBy: { reservationTime: "asc" },
      }), []),
    safeQuery("seller dashboard todaySlots", () =>
      prisma.timeSlot.findMany({
        where: { consultantId: session!.user!.id, date: { gte: dayStartUtc, lte: dayEndUtc } },
        select: { reservationId: true },
      }), []),
    safeQuery("seller dashboard monthCompletedCount", () =>
      prisma.reservation.count({
        where: { sellerId: seller.id, status: "COMPLETED", completedAt: { gte: monthStart } },
      }), 0),
  ]);

  const todayConfirmed = todayReservations.filter(
    (r) => r.status === "CONFIRMED" || r.status === "COMPLETED"
  ).length;
  const todayReservedSlots = todaySlots.filter((s) => s.reservationId).length;
  const todayRemainSlots = todaySlots.length - todayReservedSlots;
  const nextReservation = todayReservations.find(
    (r) => r.status === "CONFIRMED" || r.status === "PENDING"
  );

  // 최근 예약 5건 (고객명·상담 종류·일시·상태)
  const latestReservations = recentOrders.slice(0, 5);

  // 예약 수(생성 기준) & 매출(결제완료 기준) 기간별 집계
  const isPaid = (o: { paymentStatus: string; status: string }) =>
    o.paymentStatus === "COMPLETED" && o.status !== "CANCELLED" && o.status !== "REFUNDED";
  const inPeriod = (d: Date, start: Date) => d >= start;
  let todayOrders = 0, weekOrders = 0, monthOrders = 0;
  let todaySales = 0, weekSales = 0, monthSales = 0, revenue = 0;
  for (const o of allOrders) {
    if (inPeriod(o.createdAt, todayStart)) todayOrders++;
    if (inPeriod(o.createdAt, weekStart)) weekOrders++;
    if (inPeriod(o.createdAt, monthStart)) monthOrders++;
    if (isPaid(o)) {
      const amt = Number(o.finalAmount);
      const sale = o.paidAt ?? o.createdAt;
      revenue += amt;
      if (inPeriod(sale, todayStart)) todaySales += amt;
      if (inPeriod(sale, weekStart)) weekSales += amt;
      if (inPeriod(sale, monthStart)) monthSales += amt;
    }
  }

  const statusLabels: Record<string, { label: string; color: string }> = {
    PENDING: { label: "예약 대기", color: "bg-yellow-50 text-yellow-700" },
    CONFIRMED: { label: "예약 확정", color: "bg-blue-50 text-blue-700" },
    COMPLETED: { label: "상담 완료", color: "bg-green-50 text-green-700" },
    CANCELLED: { label: "취소", color: "bg-gray-100 text-gray-500" },
    NO_SHOW: { label: "노쇼", color: "bg-red-50 text-red-600" },
  };

  const formatResvDate = (d: Date) =>
    `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex items-center gap-2">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">상담사 대시보드</h1>
            <p className="text-xs text-gray-400 mt-0.5">{seller.shopName} · {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}</p>
          </div>
          {SHOW_BEES && <Sparkles size={44} strokeWidth={1.3}
            className="w-11 h-11 text-[#2d1b69] opacity-70 pointer-events-none select-none hidden sm:block" aria-hidden="true" />}
        </div>
      </div>

      {/* My Shop URL */}
      <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 p-3.5 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-gray-500 mb-1">내 점집 주소</p>
            <p className="text-xs text-gray-700 font-mono truncate">/shop/{seller.slug}</p>
          </div>
          <ShopLinkButton slug={seller.slug} />
        </div>
      </div>

      {!seller.isApproved && (
        <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700 flex items-center gap-2">
          <Icon name="Clock" size={14} />
          상담사 승인 대기 중입니다. 관리자 승인 후 점집이 공개됩니다.
        </div>
      )}

      {/* 오늘의 예약 현황 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">오늘의 예약 현황</h2>
          <Link href="/seller/live-mode" className="text-[11px] text-red-500 font-medium hover:underline">
            라이브 모드 열기 →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="bg-gray-900 rounded-xl p-3 sm:p-4 text-white">
            <p className="text-white/50 text-[9px] sm:text-[10px] font-medium mb-1">확정 예약</p>
            <p className="text-xl sm:text-2xl font-bold">{todayConfirmed}<span className="text-xs font-normal text-white/50 ml-0.5">건</span></p>
            <p className="text-white/40 text-[9px] sm:text-[10px] mt-1">
              {nextReservation ? `다음 ${nextReservation.reservationTime}` : "예정된 상담 없음"}
            </p>
          </div>
          <div className="bg-amber-400 rounded-xl p-3 sm:p-4 text-black">
            <p className="text-black/60 text-[9px] sm:text-[10px] font-medium mb-1">남은 슬롯</p>
            <p className="text-xl sm:text-2xl font-bold">{todayRemainSlots}<span className="text-xs font-normal text-black/50 ml-0.5">자리</span></p>
            <p className="text-black/50 text-[9px] sm:text-[10px] mt-1">전체 {todaySlots.length} · 예약 {todayReservedSlots}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4">
            <p className="text-gray-400 text-[9px] sm:text-[10px] font-medium mb-1">이번 달 매출</p>
            <p className="text-[13px] sm:text-base font-bold text-gray-900 leading-tight break-all">{formatPrice(monthSales)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4">
            <p className="text-gray-400 text-[9px] sm:text-[10px] font-medium mb-1">이번 달 완료 상담</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{monthCompletedCount}<span className="text-xs font-normal text-gray-300 ml-0.5">건</span></p>
          </div>
        </div>
      </div>

      {/* 빠른 액세스 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          { href: "/seller/timeslots", label: "슬롯 관리", desc: "상담 가능 시간", icon: "Clock" },
          { href: "/seller/reservations", label: "예약 관리", desc: "확정·완료 처리", icon: "Calendar" },
          { href: "/seller/customers", label: "고객 목록", desc: "상담 이력·메모", icon: "Users" },
          { href: "/seller/live-mode", label: "라이브 모드", desc: "방송 중 현황", icon: "Live" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2.5 p-3 sm:p-3.5 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all group"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gray-50 group-hover:bg-gray-100 flex items-center justify-center transition-colors flex-shrink-0">
              <Icon name={item.icon} size={15} className="text-gray-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-gray-800 truncate">{item.label}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 truncate">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* 예약 수 (오늘 / 이번주 / 이번달) */}
      <div>
        <h2 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">예약 수</h2>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="bg-amber-400 rounded-xl p-3 sm:p-4 text-black">
            <p className="text-black/60 text-[9px] sm:text-[10px] font-medium mb-1">오늘</p>
            <p className="text-xl sm:text-2xl font-bold">{todayOrders}</p>
            <p className="text-black/50 text-[9px] sm:text-[10px] mt-1">처리대기 {pendingOrders}건</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4">
            <p className="text-gray-400 text-[9px] sm:text-[10px] font-medium mb-1">이번주</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{weekOrders}</p>
            <p className="text-gray-300 text-[9px] sm:text-[10px] mt-1">건</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4">
            <p className="text-gray-400 text-[9px] sm:text-[10px] font-medium mb-1">이번달</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{monthOrders}</p>
            <p className="text-gray-300 text-[9px] sm:text-[10px] mt-1">건</p>
          </div>
        </div>
      </div>

      {/* 매출 (오늘 / 이번주 / 이번달 / 누적) */}
      <div>
        <h2 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">매출</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {[
            { label: "오늘", value: todaySales },
            { label: "이번주", value: weekSales },
            { label: "이번달", value: monthSales },
            { label: "총 누적", value: revenue, accent: true },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl p-3 sm:p-4 ${s.accent ? "bg-amber-400 text-black" : "bg-white border border-gray-100"}`}>
              <p className={`text-[9px] sm:text-[10px] font-medium mb-1 ${s.accent ? "text-black/60" : "text-gray-400"}`}>{s.label}</p>
              <p className={`text-[13px] sm:text-base font-bold leading-tight break-all ${s.accent ? "text-black" : "text-gray-900"}`}>{formatPrice(s.value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: "내 상담상품", value: seller._count.shopProducts, icon: "ProductManagement_icon", color: "text-blue-500" },
          { label: "팬 수", value: seller.totalFans, icon: "Users_icon", color: "text-pink-500" },
          { label: "총 예약", value: totalReservationCount, icon: "OrderManagement_icon", color: "text-orange-500" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl p-3 sm:p-4 border border-gray-100">
            <Icon name={kpi.icon} size={16} className={`${kpi.color} mb-1.5 sm:mb-2`} />
            <p className="text-base sm:text-lg font-bold text-gray-900">{typeof kpi.value === "number" ? kpi.value.toLocaleString() : kpi.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* 내 라이브 코드 + 공유 */}
      <SellerLiveCodeCard code={seller.slug} shopName={seller.shopName} />

      {/* 최근 예약 */}
      <div>
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
            <h2 className="text-sm font-bold text-gray-900">최근 예약</h2>
            <Link href="/seller/reservations" className="text-[11px] text-gray-400 hover:text-gray-600">전체보기 →</Link>
          </div>
          {latestReservations.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {latestReservations.map((order) => {
                const st = statusLabels[order.status] || { label: order.status, color: "bg-gray-50 text-gray-600" };
                return (
                  <div key={order.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 transition-colors">
                    <div className="min-w-0 flex-1 pr-2">
                      {/* 고객명 + 상담 종류 강조, 일시는 아래 */}
                      <p className="text-[14px] font-bold text-gray-900 truncate">
                        {order.customerName || order.user.name}
                        <span className="text-[12px] font-normal text-gray-500 ml-1.5">
                          {order.items[0]?.productName || "상담"}
                          {order.items.length > 1 && ` 외 ${order.items.length - 1}건`}
                        </span>
                      </p>
                      <p className="text-[12px] text-gray-500">
                        {formatResvDate(order.reservationDate)} {order.reservationTime}
                      </p>
                      <p className="text-[10px] text-gray-300">예약 {order.reservationNumber}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-[13px] font-bold text-gray-900">{formatPrice(Number(order.finalAmount))}</p>
                      <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10">
              <Icon name="Package" size={28} className="mx-auto text-gray-200 mb-2" />
              <p className="text-xs text-gray-400">아직 예약이 없습니다.</p>
            </div>
          )}
        </div>
      </div>

      {/* Popular Products */}
      {topProducts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-50">
            <h2 className="text-sm font-bold text-gray-900">인기 상담상품</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {topProducts.map((sp, idx) => (
              <div key={sp.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50 transition-colors">
                <HexNumBadge size={20} fontSize={10} className="flex-shrink-0">{idx + 1}</HexNumBadge>
                <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                  <SafeImage src={sp.product.thumbnail} placeholder={DEFAULT_PRODUCT_IMAGE} alt={sp.product.name} width={40} height={40} fallbackText="No Img" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-gray-800 truncate">{sp.product.name}</p>
                  <p className="text-[11px] text-gray-400">판매 {sp.product.soldCount}개</p>
                </div>
                <p className="text-[13px] font-bold text-gray-900">{formatPrice(Number(sp.product.basePrice))}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Reviews */}
      {recentReviews.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-50">
            <h2 className="text-sm font-bold text-gray-900">최근 후기</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {recentReviews.map((review) => (
              <div key={review.id} className="px-5 py-3 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Icon name="Star" key={i} size={10} className={i < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"} />
                    ))}
                  </div>
                  <span className="text-[11px] font-medium text-gray-600">{review.user.name}</span>
                  <span className="text-[10px] text-gray-300">·</span>
                  <span className="text-[10px] text-gray-400 truncate">{review.product.name}</span>
                </div>
                <p className="text-[12px] text-gray-600 line-clamp-1">{review.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-bold text-gray-900 mb-3">빠른 관리</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          {[
            { href: "/seller/products", label: "상담상품 관리", icon: "ProductManagement_icon", desc: "상담사 상담상품" },
            { href: "/seller/campaigns", label: "캠페인", icon: "Event", desc: "공구 캠페인" },
            { href: "/seller/fans", label: "팬 관리", icon: "Users_icon", desc: "팬 소통" },
            { href: "/seller/customers", label: "고객 관리", icon: "Users", desc: "CRM · 상담 이력" },
            { href: "/seller/reservations", label: "예약 관리", icon: "OrderManagement_icon", desc: "예약 처리" },
            { href: "/seller/settlements", label: "정산", icon: "Settlement_icon", desc: "수익 정산" },
            { href: "/seller/live", label: "라이브", icon: "Live_icon", desc: "라이브 방송" },
            { href: `/shop/${seller.slug}`, label: "SHOP 바로가기", icon: "Store", desc: "점집 바로가기" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 sm:gap-3 p-3 sm:p-3.5 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all group"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gray-50 group-hover:bg-gray-100 flex items-center justify-center transition-colors">
                <Icon name={item.icon} size={15} className="text-gray-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-gray-800 group-hover:text-gray-900 truncate">{item.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
