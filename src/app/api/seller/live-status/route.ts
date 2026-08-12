import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** "김지훈" → "김○○" (라이브 화면 노출용 마스킹) */
function maskName(name: string): string {
  const trimmed = (name || "").trim();
  if (!trimmed) return "고객";
  if (trimmed.length === 1) return trimmed;
  return trimmed[0] + "○".repeat(trimmed.length - 1);
}

// GET /api/seller/live-status?date=YYYY-MM-DD — 라이브 모드용 오늘 슬롯·예약 현황
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CONSULTANT") {
    return NextResponse.json({ error: "상담사만 조회할 수 있습니다." }, { status: 403 });
  }

  const seller = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!seller) {
    return NextResponse.json({ error: "상담사 프로필이 없습니다." }, { status: 404 });
  }

  // 클라이언트(브라우저) 로컬 기준 오늘 날짜를 그대로 사용한다.
  // 슬롯/예약 날짜는 "YYYY-MM-DD" 를 UTC 자정으로 저장하므로 UTC 경계로 조회한다.
  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date");
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateParam || "")
    ? (dateParam as string)
    : new Date().toISOString().slice(0, 10);
  const dayStart = new Date(date + "T00:00:00.000Z");
  const dayEnd = new Date(date + "T23:59:59.999Z");

  const [slots, recent] = await Promise.all([
    prisma.timeSlot.findMany({
      where: { consultantId: session.user.id, date: { gte: dayStart, lte: dayEnd } },
      orderBy: { startTime: "asc" },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        isAvailable: true,
        reservation: { select: { id: true, customerName: true, status: true } },
      },
    }),
    // 최근 들어온 예약 알림 (오늘 슬롯에 한정하지 않고 최근 생성 순)
    prisma.reservation.findMany({
      where: { sellerId: seller.id, status: { not: "CANCELLED" } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        customerName: true,
        status: true,
        reservationDate: true,
        reservationTime: true,
        finalAmount: true,
        createdAt: true,
        items: { select: { productName: true } },
      },
    }),
  ]);

  const reservedSlots = slots.filter((s) => s.reservation != null).length;

  return NextResponse.json({
    date,
    totalSlots: slots.length,
    reservedSlots,
    availableSlots: slots.length - reservedSlots,
    slots: slots.map((s) => ({
      id: s.id,
      startTime: s.startTime,
      endTime: s.endTime,
      isAvailable: s.isAvailable,
      customerName: s.reservation ? maskName(s.reservation.customerName) : null,
      status: s.reservation?.status ?? null,
    })),
    recentReservations: recent.map((r) => ({
      id: r.id,
      customerName: maskName(r.customerName),
      status: r.status,
      reservationDate: r.reservationDate.toISOString(),
      reservationTime: r.reservationTime,
      productName: r.items[0]?.productName ?? null,
      finalAmount: Number(r.finalAmount),
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
