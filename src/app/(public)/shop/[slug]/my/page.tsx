import { Icon } from "@/components/shared/Icon";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import SafeImage from "@/components/shared/SafeImage";
import SellerShopBottomNav from "@/components/shared/SellerShopBottomNav";
import { auth } from "@/lib/auth";
import { pickBuyerAvatar } from "@/lib/defaults";
import { safeQuery } from "@/lib/safeDb";
import { Sparkles, MessageCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ShopMyPage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}) {
  const { slug } = await Promise.resolve(params);

  // 상담사 존재 확인
  const seller = await prisma.sellerProfile.findUnique({
    where: { slug },
    select: { id: true, slug: true, shopName: true, isApproved: true, user: { select: { name: true } } },
  });
  if (!seller || !seller.isApproved) notFound();

  // 인증 확인 (비로그인 → 점집 로그인 페이지로)
  const session = await auth();
  if (!session?.user) {
    redirect(`/auth/login?callbackUrl=${encodeURIComponent(`/shop/${slug}/my`)}`);
  }

  const userId = session.user.id!;

  // 사용자 정보 조회
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: { select: { reviews: true } },
    },
  });

  if (!user) redirect(`/auth/login?callbackUrl=${encodeURIComponent(`/shop/${slug}/my`)}`);

  // 이 점집에서의 예약 내역
  const shopReservations = await safeQuery(
    "shop my page reservations",
    () =>
      prisma.reservation.findMany({
        where: { userId, sellerId: seller.id },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          status: true,
          reservationDate: true,
          reservationTime: true,
          createdAt: true,
          product: { select: { name: true } },
        },
      }),
    [] as {
      id: string;
      status: string;
      reservationDate: Date;
      reservationTime: string;
      createdAt: Date;
      product: { name: string } | null;
    }[],
  );

  // AI 상담 요약 — 이 상담사의 라이브 채팅에서 AI 봇 메시지 추출
  const participatedStreamIds = await safeQuery(
    "shop my page stream ids",
    async () => {
      const msgs = await prisma.liveChatMessage.findMany({
        where: { userId, liveStream: { sellerId: seller.id } },
        select: { liveStreamId: true },
        distinct: ["liveStreamId"],
      });
      return msgs.map((m: { liveStreamId: string }) => m.liveStreamId);
    },
    [] as string[],
  );

  const aiSummaries = participatedStreamIds.length > 0
    ? await safeQuery(
        "shop my page ai summaries",
        () =>
          prisma.liveChatMessage.findMany({
            where: {
              isBot: true,
              liveStream: { sellerId: seller.id },
              liveStreamId: { in: participatedStreamIds },
            },
            include: { liveStream: { select: { title: true, startedAt: true, shareCode: true } } },
            orderBy: { createdAt: "desc" },
            take: 20,
          }),
        [] as any[],
      )
    : [];

  // 라이브 스트림별로 그룹핑 (최신 AI 메시지 1개씩)
  const summaryByStream = new Map<string, (typeof aiSummaries)[number]>();
  for (const msg of aiSummaries) {
    if (!summaryByStream.has(msg.liveStreamId)) {
      summaryByStream.set(msg.liveStreamId, msg);
    }
  }
  const consultSummaries = [...summaryByStream.values()];

  const consultantName = seller.user.name || seller.shopName;

  const RESERVATION_STATUS: Record<string, { label: string; color: string }> = {
    PENDING: { label: "예약신청", color: "bg-yellow-50 text-yellow-700" },
    CONFIRMED: { label: "예약확정", color: "bg-blue-50 text-blue-600" },
    COMPLETED: { label: "상담완료", color: "bg-green-50 text-green-600" },
    CANCELLED: { label: "취소됨", color: "bg-red-50 text-red-600" },
    NO_SHOW: { label: "노쇼", color: "bg-gray-100 text-gray-500" },
  };

  return (
    <div className="animate-fade-in pb-32">
      {/* 헤더 */}
      <div className="bg-violet-600 px-4 pt-6 pb-10">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
            <img
              src={user.avatar || pickBuyerAvatar(user.id, (user as any).gender)}
              alt={user.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white">{user.name}</h1>
            {user.email && !user.email.endsWith("@no-email.local") && (
              <p className="text-xs text-white/70">{user.email}</p>
            )}
          </div>
          <Link href="/my/settings" className="p-2 text-white/80 hover:text-white">
            <Icon name="Settings" size={20} strokeWidth={1.5} />
          </Link>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="mx-4 -mt-6 bg-white rounded-2xl border border-gray-100 p-4 mb-4 shadow-sm">
        <div className="grid grid-cols-2 divide-x divide-gray-100">
          <div className="text-center py-1">
            <p className="text-lg font-bold text-gray-900">{shopReservations.length}</p>
            <p className="text-[10px] text-gray-400">이 점집 예약</p>
          </div>
          <Link href="/my/reservations" className="text-center py-1">
            <p className="text-lg font-bold text-gray-900">{user._count.reviews}</p>
            <p className="text-[10px] text-gray-400">리뷰</p>
          </Link>
        </div>
      </div>

      {/* 빠른 메뉴 */}
      <div className="px-4 mb-4">
        <div className="grid grid-cols-3 gap-3">
          <Link
            href="/my/reservations"
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-100"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Icon name="File" size={20} />
            </div>
            <p className="text-xs font-medium text-gray-800">예약 내역</p>
          </Link>
          <Link
            href={`/shop/${slug}/book`}
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-100"
          >
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
              <Icon name="Calendar" size={20} />
            </div>
            <p className="text-xs font-medium text-gray-800">예약하기</p>
          </Link>
          <Link
            href="/my/settings"
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-100"
          >
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
              <Icon name="Settings" size={20} />
            </div>
            <p className="text-xs font-medium text-gray-800">설정</p>
          </Link>
        </div>
      </div>

      {/* 이 점집에서의 상담 내역 */}
      <div className="px-4 mb-4">
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <Icon name="File" size={14} className="text-violet-500" />
              {consultantName} 상담 내역
            </h2>
            {shopReservations.length > 0 && (
              <Link href="/my/reservations" className="text-xs text-violet-600 hover:underline">
                전체보기 ({shopReservations.length})
              </Link>
            )}
          </div>
          {shopReservations.length > 0 ? (
            <div className="px-4 pb-3">
              {shopReservations.slice(0, 5).map((r: any) => {
                const status = RESERVATION_STATUS[r.status] ?? { label: r.status, color: "bg-gray-50 text-gray-600" };
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-[14px] font-bold text-gray-900 truncate">
                        {r.product?.name || "상담"}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(r.reservationDate).toLocaleDateString("ko-KR")} {r.reservationTime}
                      </p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 px-4">
              <Icon name="File" size={36} strokeWidth={1.5} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs">아직 상담 내역이 없습니다.</p>
            </div>
          )}
        </div>
      </div>

      {/* AI 상담 요약본 */}
      <div className="px-4 mb-4">
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <Sparkles size={14} className="text-violet-500" />
              AI 상담 요약본
            </h2>
            <p className="text-[11px] text-gray-400 mt-0.5">라이브 상담에서 AI가 정리한 내용이에요</p>
          </div>
          {consultSummaries.length > 0 ? (
            <div className="px-4 pb-3 space-y-3">
              {consultSummaries.map((msg: any) => (
                <div key={msg.id} className="bg-violet-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Sparkles size={11} className="text-violet-500 flex-shrink-0" />
                    <p className="text-[11px] font-bold text-violet-700 truncate">
                      {msg.liveStream.title}
                    </p>
                    <span className="text-[10px] text-gray-400 ml-auto flex-shrink-0">
                      {msg.liveStream.startedAt
                        ? new Date(msg.liveStream.startedAt).toLocaleDateString("ko-KR")
                        : new Date(msg.createdAt).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed line-clamp-3">{msg.message}</p>
                  {msg.liveStream.shareCode && (
                    <Link
                      href={`/live/${msg.liveStream.shareCode}`}
                      className="text-[10px] text-violet-600 mt-1.5 inline-block hover:underline"
                    >
                      라이브 다시보기 →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 px-4">
              <div className="w-12 h-12 rounded-full bg-violet-50 flex items-center justify-center mx-auto mb-2">
                <MessageCircle size={22} className="text-violet-300" />
              </div>
              <p className="text-xs text-gray-500 font-medium">아직 AI 상담 요약본이 없어요</p>
              <p className="text-[11px] text-gray-400 mt-1">
                {consultantName}의 라이브 상담에 참여하면<br />AI가 상담 내용을 정리해드려요
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 점집 하단 네비 */}
      <SellerShopBottomNav sellerSlug={slug} />
    </div>
  );
}
