import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// 예약 진행 상태 라벨. 배송 개념이 사라지고 예약 라이프사이클로 대체됐다.
const RESERVATION_STATUS_LABELS: Record<string, string> = {
  PENDING: "예약 신청",
  CONFIRMED: "예약 확정",
  COMPLETED: "서비스 완료",
  CANCELLED: "취소",
  NO_SHOW: "노쇼",
};

type ReservationStatusKey = keyof typeof RESERVATION_STATUS_LABELS;

// GET: 예약 진행 상태 조회
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const resolvedParams = await Promise.resolve(params);

    const reservation = await prisma.reservation.findUnique({
      where: { id: resolvedParams.id },
      select: {
        id: true,
        status: true,
        reservationDate: true,
        reservationTime: true,
        confirmedAt: true,
        completedAt: true,
        noShowAt: true,
      },
    });

    if (!reservation) {
      return NextResponse.json({ error: "예약을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ reservation });
  } catch (e: any) {
    console.error("[reservation status GET]", e?.message || e);
    return NextResponse.json({ error: "조회에 실패했습니다." }, { status: 500 });
  }
}

// PATCH: 예약 진행 상태 변경 (SUPER_ADMIN, 담당 뷰티 전문가만 가능)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const role = (session.user as any).role as string;
    if (!["SUPER_ADMIN", "CONSULTANT"].includes(role)) {
      return NextResponse.json({ error: "예약 상태를 변경할 권한이 없습니다." }, { status: 403 });
    }

    const resolvedParams = await Promise.resolve(params);
    const reservationId = resolvedParams.id;

    const body = await request.json();
    const status = body?.status as ReservationStatusKey | undefined;

    if (!status || !RESERVATION_STATUS_LABELS[status]) {
      return NextResponse.json({ error: "올바르지 않은 예약 상태입니다." }, { status: 400 });
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { id: true, sellerId: true, seller: { select: { userId: true } } },
    });

    if (!reservation) {
      return NextResponse.json({ error: "예약을 찾을 수 없습니다." }, { status: 404 });
    }

    // 뷰티 전문가는 본인 예약만 변경 가능
    if (role === "CONSULTANT" && reservation.seller?.userId !== session.user.id) {
      return NextResponse.json({ error: "본인 예약만 변경할 수 있습니다." }, { status: 403 });
    }

    const now = new Date();
    const updated = await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: status as any,
        ...(status === "CONFIRMED" && { confirmedAt: now }),
        ...(status === "COMPLETED" && { completedAt: now }),
        ...(status === "NO_SHOW" && { noShowAt: now }),
        ...(status === "CANCELLED" && { cancelledAt: now }),
      },
      select: {
        id: true,
        status: true,
        confirmedAt: true,
        completedAt: true,
        noShowAt: true,
        cancelledAt: true,
      },
    });

    return NextResponse.json({ reservation: updated });
  } catch (e: any) {
    console.error("[reservation status PATCH]", e?.message || e);
    return NextResponse.json({ error: "예약 상태 업데이트에 실패했습니다." }, { status: 500 });
  }
}
