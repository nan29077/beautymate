import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// PATCH /api/reservations/[id] — 상태 변경
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await Promise.resolve(params);
  const body = await request.json();
  const { status } = body;

  if (!status) {
    return NextResponse.json({ error: "상태 값이 필요합니다." }, { status: 400 });
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { seller: true },
  });

  if (!reservation) {
    return NextResponse.json({ error: "예약을 찾을 수 없습니다." }, { status: 404 });
  }

  const role = session.user.role;

  // 권한 체크
  if (role === "CUSTOMER") {
    // 고객은 본인 예약만, CANCELLED만 가능
    if (reservation.userId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }
    if (status !== "CANCELLED") {
      return NextResponse.json({ error: "고객은 취소만 가능합니다." }, { status: 403 });
    }
    if (reservation.status !== "PENDING") {
      return NextResponse.json({ error: "대기 중인 예약만 취소할 수 있습니다." }, { status: 400 });
    }
  } else if (role === "CONSULTANT") {
    // 상담사는 본인 샵 예약만
    if (reservation.seller.userId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }
    const allowed = ["CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"];
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: "허용되지 않은 상태 변경입니다." }, { status: 400 });
    }
  }
  // SUPER_ADMIN: 모든 변경 허용

  // 상태 변경 시각 업데이트
  const now = new Date();
  const extraData: Record<string, unknown> = {};
  if (status === "CONFIRMED") extraData.confirmedAt = now;
  else if (status === "COMPLETED") extraData.completedAt = now;
  else if (status === "CANCELLED") extraData.cancelledAt = now;
  else if (status === "NO_SHOW") extraData.noShowAt = now;

  // 취소 시 슬롯 해제
  if (status === "CANCELLED") {
    const slot = await prisma.timeSlot.findFirst({
      where: { reservationId: id },
    });
    if (slot) {
      await prisma.timeSlot.update({
        where: { id: slot.id },
        data: { isAvailable: true, reservationId: null },
      });
    }
  }

  const updated = await prisma.reservation.update({
    where: { id },
    data: { status, ...extraData },
  });

  return NextResponse.json({ reservation: updated });
}

// GET /api/reservations/[id] — 예약 상세
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await Promise.resolve(params);

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      seller: { select: { id: true, shopName: true, slug: true, user: { select: { name: true, avatar: true } } } },
      items: { include: { variant: { select: { name: true } } } },
      timeSlot: { select: { id: true, startTime: true, endTime: true } },
    },
  });

  if (!reservation) {
    return NextResponse.json({ error: "예약을 찾을 수 없습니다." }, { status: 404 });
  }

  // 권한 체크
  const role = session.user.role;
  if (role === "CUSTOMER" && reservation.userId !== session.user.id) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  if (role === "CONSULTANT" && reservation.seller.user.name) {
    const seller = await prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
    if (!seller || seller.id !== reservation.sellerId) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }
  }

  return NextResponse.json({
    reservation: {
      ...reservation,
      totalAmount: Number(reservation.totalAmount),
      discountAmount: Number(reservation.discountAmount),
      finalAmount: Number(reservation.finalAmount),
      items: reservation.items.map((i) => ({
        ...i,
        price: Number(i.price),
        totalPrice: Number(i.totalPrice),
      })),
    },
  });
}
