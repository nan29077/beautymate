import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/safeDb";

export const dynamic = "force-dynamic";

// GET /api/seller/members — 내 점집 회원 목록 (상담사 전용)
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CONSULTANT") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const seller = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!seller) {
    return NextResponse.json({ error: "상담사 프로필이 없습니다." }, { status: 404 });
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim();

  const members = await safeQuery("seller shop members", () =>
    prisma.shopMembership.findMany({
      where: {
        shopId: seller.id,
        ...(search
          ? {
              user: {
                OR: [
                  { name: { contains: search } },
                  { email: { contains: search } },
                  { phone: { contains: search } },
                ],
              },
            }
          : {}),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, createdAt: true },
        },
      },
      orderBy: { joinedAt: "desc" },
    }), []);

  // 회원별 예약 수 집계 (예약 테이블 미반영 환경 대비 폴백)
  const userIds = members.map((m) => m.userId);
  const reservationCounts = await safeQuery("seller member reservation counts", () =>
    prisma.reservation.groupBy({
      by: ["userId"],
      where: { sellerId: seller.id, userId: { in: userIds } },
      _count: { _all: true },
    }), []);
  const countMap = new Map(reservationCounts.map((r) => [r.userId, r._count._all]));

  return NextResponse.json({
    members: members.map((m) => ({
      id: m.id,
      joinedAt: m.joinedAt,
      user: m.user,
      reservationCount: countMap.get(m.userId) ?? 0,
    })),
    total: members.length,
  });
}
