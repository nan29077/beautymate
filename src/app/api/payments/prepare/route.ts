import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMissingSchemaError } from "@/lib/safeDb";
import { isMockPgEnabled } from "@/lib/mockPg";

export const dynamic = "force-dynamic";

// POST /api/payments/prepare — 예약 결제 초기화 (통합 진입점)
// body: { reservationId }
// 설정된 PG에 따라 사용 가능한 결제 수단 목록을 내려준다.
//  - seedpay(카드): GET /api/payments/seedpay/launch?orderId=..&full=1 로 이동
//  - ongi(간편계좌): POST /api/payments/ongi/prepare 로 checkoutUrl 수령 후 이동
//  - mock(개발용): /pay/mock 시뮬레이션 페이지로 이동
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { reservationId } = await request.json();
  if (!reservationId) {
    return NextResponse.json({ error: "reservationId가 필요합니다." }, { status: 400 });
  }

  let reservation;
  try {
    reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        id: true,
        userId: true,
        status: true,
        paymentStatus: true,
        finalAmount: true,
      },
    });
  } catch (e) {
    if (isMissingSchemaError(e)) {
      return NextResponse.json(
        { error: "예약 기능이 아직 준비 중입니다." },
        { status: 503 },
      );
    }
    throw e;
  }

  if (!reservation) {
    return NextResponse.json({ error: "예약을 찾을 수 없습니다." }, { status: 404 });
  }
  if (reservation.userId !== session.user.id) {
    return NextResponse.json({ error: "본인 예약만 결제할 수 있습니다." }, { status: 403 });
  }
  if (reservation.paymentStatus === "COMPLETED") {
    return NextResponse.json({ error: "이미 결제 완료된 예약입니다." }, { status: 400 });
  }
  if (reservation.status === "CANCELLED") {
    return NextResponse.json({ error: "취소된 예약입니다." }, { status: 400 });
  }

  const providers: { key: string; label: string; checkoutUrl?: string }[] = [];

  if (process.env.SEEDPAY_MID && process.env.SEEDPAY_MERCHANT_KEY) {
    providers.push({
      key: "seedpay",
      label: "카드 결제",
      checkoutUrl: `/api/payments/seedpay/launch?orderId=${encodeURIComponent(reservation.id)}&full=1`,
    });
  }
  if (process.env.ONGI_MID && process.env.ONGI_QR_CODE) {
    // checkoutUrl 은 클라이언트가 POST /api/payments/ongi/prepare 로 받아 이동한다
    providers.push({ key: "ongi", label: "간편 계좌결제" });
  }
  if (isMockPgEnabled()) {
    providers.push({
      key: "mock",
      label: "테스트 결제 (개발용)",
      checkoutUrl: `/pay/mock?reservationId=${encodeURIComponent(reservation.id)}`,
    });
  }

  return NextResponse.json({
    reservationId: reservation.id,
    amount: Math.round(Number(reservation.finalAmount)),
    providers,
  });
}
