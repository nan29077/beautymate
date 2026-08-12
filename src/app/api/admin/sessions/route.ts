import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/safeDb";

export const dynamic = "force-dynamic";

// GET /api/admin/sessions — 전체 영상 세션 목록 (관리자 전용)
// query: status(ALL|WAITING|ACTIVE|COMPLETED|CANCELLED), date(YYYY-MM-DD), consultantId, page, limit
export async function GET(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const date = url.searchParams.get("date");
  const consultantId = url.searchParams.get("consultantId");
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50")));

  const where: Record<string, unknown> = {};
  if (status && status !== "ALL") where.status = status;
  if (consultantId) where.reservation = { sellerId: consultantId };
  if (date) {
    where.reservation = {
      ...((where.reservation as object) || {}),
      reservationDate: {
        gte: new Date(date),
        lte: new Date(`${date}T23:59:59.999Z`),
      },
    };
  }

  const [sessions, total] = await safeQuery(
    "admin sessions list",
    () =>
      Promise.all([
        prisma.consultingSession.findMany({
          where,
          include: {
            reservation: {
              select: {
                id: true,
                reservationNumber: true,
                reservationDate: true,
                reservationTime: true,
                customerName: true,
                status: true,
                seller: {
                  select: {
                    id: true,
                    shopName: true,
                    slug: true,
                    user: { select: { name: true } },
                  },
                },
                items: { select: { productName: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.consultingSession.count({ where }),
      ]),
    [[], 0],
  );

  return NextResponse.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      status: s.status,
      roomName: s.roomName,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      duration: s.duration,
      createdAt: s.createdAt,
      reservation: {
        id: s.reservation.id,
        reservationNumber: s.reservation.reservationNumber,
        reservationDate: s.reservation.reservationDate,
        reservationTime: s.reservation.reservationTime,
        customerName: s.reservation.customerName,
        status: s.reservation.status,
        shopName: s.reservation.seller.shopName,
        consultantName: s.reservation.seller.user.name,
        productName: s.reservation.items[0]?.productName ?? null,
      },
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
