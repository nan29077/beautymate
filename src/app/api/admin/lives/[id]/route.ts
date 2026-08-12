import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/safeDb";

export const dynamic = "force-dynamic";

// GET /api/admin/lives/[id] — 라이브 상세 + 방송 유래 예약 목록·상태별 집계 (관리자 전용)
export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const live = await prisma.liveStream.findUnique({
    where: { id: params.id },
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
      likeCount: true,
      platform: true,
      seller: {
        select: { id: true, shopName: true, slug: true, user: { select: { name: true } } },
      },
      products: {
        select: {
          id: true,
          product: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!live) {
    return NextResponse.json({ error: "라이브를 찾을 수 없습니다." }, { status: 404 });
  }

  // 방송 유래 예약 — reservations 테이블 미반영 환경에서는 빈 값
  const reservations = await safeQuery("admin live detail reservations", () =>
    prisma.reservation.findMany({
      where: { liveStreamId: live.id },
      select: {
        id: true,
        reservationNumber: true,
        status: true,
        paymentStatus: true,
        finalAmount: true,
        reservationDate: true,
        reservationTime: true,
        customerName: true,
        customerPhone: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }), []);

  // 상태별 집계
  const summary = { total: reservations.length, PENDING: 0, CONFIRMED: 0, COMPLETED: 0, CANCELLED: 0, NO_SHOW: 0 };
  let totalAmount = 0;
  for (const r of reservations) {
    summary[r.status] += 1;
    if (r.status !== "CANCELLED") totalAmount += Number(r.finalAmount);
  }

  // 예약 위젯 설정 (테이블 미반영 시 null)
  const settings = await safeQuery("admin live detail settings", () =>
    prisma.liveReservationSettings.findUnique({
      where: { liveStreamId: live.id },
      select: { dailySlotLimit: true, showReservationWidget: true },
    }), null);

  return NextResponse.json({
    live: {
      id: live.id,
      title: live.title,
      status: live.status,
      scheduledAt: live.scheduledAt,
      startedAt: live.startedAt,
      endedAt: live.endedAt,
      shareCode: live.shareCode,
      viewerCount: live.viewerCount,
      peakViewerCount: live.peakViewerCount,
      likeCount: live.likeCount,
      platform: live.platform,
      shopName: live.seller.shopName,
      shopSlug: live.seller.slug,
      consultantName: live.seller.user.name,
      products: live.products.map((p) => ({ id: p.product.id, name: p.product.name })),
    },
    reservations: reservations.map((r) => ({
      id: r.id,
      reservationNumber: r.reservationNumber,
      status: r.status,
      paymentStatus: r.paymentStatus,
      finalAmount: Number(r.finalAmount),
      reservationDate: r.reservationDate,
      reservationTime: r.reservationTime,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      createdAt: r.createdAt,
      userName: r.user?.name ?? null,
      userEmail: r.user?.email ?? null,
    })),
    summary,
    totalAmount,
    reservationSettings: settings,
  });
}
