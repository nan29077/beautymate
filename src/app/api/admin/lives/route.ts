import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/safeDb";

export const dynamic = "force-dynamic";

// GET /api/admin/lives — 전체 라이브 목록 + 방송별 예약 현황 (관리자 전용)
// query: status(ALL|SCHEDULED|LIVE|ENDED|CANCELLED), sellerId, page, limit
export async function GET(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const sellerId = url.searchParams.get("sellerId");
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "30")));

  const where = {
    ...(status && status !== "ALL"
      ? { status: status as "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED" }
      : {}),
    ...(sellerId ? { sellerId } : {}),
  };

  const [lives, total] = await Promise.all([
    prisma.liveStream.findMany({
      where,
      select: {
        id: true,
        title: true,
        status: true,
        scheduledAt: true,
        startedAt: true,
        endedAt: true,
        shareCode: true,
        viewerCount: true,
        peakViewerCount: true,
        platform: true,
        seller: {
          select: { id: true, shopName: true, slug: true, user: { select: { name: true } } },
        },
        _count: { select: { products: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.liveStream.count({ where }),
  ]);

  // 방송별 예약 집계 — reservations 테이블 미반영 환경에서는 빈 값
  const liveIds = lives.map((l) => l.id);
  const reservationCounts = await safeQuery("admin live reservation counts", () =>
    prisma.reservation.groupBy({
      by: ["liveStreamId", "status"],
      where: { liveStreamId: { in: liveIds } },
      _count: { _all: true },
    }), []);
  const countMap = new Map<string, { total: number; confirmed: number; completed: number }>();
  for (const row of reservationCounts) {
    if (!row.liveStreamId) continue;
    const entry = countMap.get(row.liveStreamId) ?? { total: 0, confirmed: 0, completed: 0 };
    if (row.status !== "CANCELLED") entry.total += row._count._all;
    if (row.status === "CONFIRMED") entry.confirmed += row._count._all;
    if (row.status === "COMPLETED") entry.completed += row._count._all;
    countMap.set(row.liveStreamId, entry);
  }

  // 예약 설정 (테이블 미반영 시 빈 값)
  const settings = await safeQuery("admin live reservation settings", () =>
    prisma.liveReservationSettings.findMany({
      where: { liveStreamId: { in: liveIds } },
      select: { liveStreamId: true, dailySlotLimit: true, showReservationWidget: true },
    }), []);
  const settingsMap = new Map(settings.map((s) => [s.liveStreamId, s]));

  const sellers = await prisma.sellerProfile.findMany({
    where: { isApproved: true },
    select: { id: true, shopName: true },
    orderBy: { shopName: "asc" },
  });

  return NextResponse.json({
    lives: lives.map((l) => ({
      id: l.id,
      title: l.title,
      status: l.status,
      scheduledAt: l.scheduledAt,
      startedAt: l.startedAt,
      endedAt: l.endedAt,
      shareCode: l.shareCode,
      viewerCount: l.viewerCount,
      peakViewerCount: l.peakViewerCount,
      platform: l.platform,
      productCount: l._count.products,
      shopName: l.seller.shopName,
      shopSlug: l.seller.slug,
      consultantName: l.seller.user.name,
      sellerId: l.seller.id,
      reservations: countMap.get(l.id) ?? { total: 0, confirmed: 0, completed: 0 },
      reservationSettings: settingsMap.get(l.id)
        ? {
            dailySlotLimit: settingsMap.get(l.id)!.dailySlotLimit,
            showReservationWidget: settingsMap.get(l.id)!.showReservationWidget,
          }
        : null,
    })),
    sellers,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
