import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: 이 채널(상담사)에서 내가 구매한 예약 내역
export async function GET(
  _req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const live = await prisma.liveStream.findUnique({
      where: { shareCode: params.code },
      select: { sellerId: true },
    });
    if (!live) {
      return NextResponse.json({ error: "라이브 채널을 찾을 수 없습니다." }, { status: 404 });
    }

    const orders = await prisma.reservation.findMany({
      where: { userId: session.user.id, sellerId: live.sellerId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      orders: orders.map((o) => ({
        id: o.id,
        reservationNumber: o.reservationNumber,
        status: o.status,
        paymentStatus: o.paymentStatus,
        finalAmount: Number(o.finalAmount),
        createdAt: o.createdAt,
        items: o.items.map((it) => ({
          id: it.id,
          productName: it.productName,
          variantName: it.variantName,
          quantity: it.quantity,
          totalPrice: Number(it.totalPrice),
        })),
      })),
    });
  } catch (error) {
    console.error("채널 예약 조회 오류:", error);
    return NextResponse.json({ error: "예약 내역을 불러올 수 없습니다." }, { status: 500 });
  }
}
