import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyOrderCancelled } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// POST: 최고관리자가 결제취소 승인
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    const role = (session.user as any).role as string;
    if (role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "최고관리자만 결제취소를 승인할 수 있습니다." }, { status: 403 });
    }

    const resolvedParams = await Promise.resolve(params);
    const orderId = resolvedParams.id;

    // 예약 조회
    const order = await (prisma.reservation.findUnique as any)({
      where: { id: orderId },
      select: {
        id: true,
        cancelStatus: true,
        cancelType: true,
        pgTid: true,
        pgProvider: true,
        campaignId: true,
        finalAmount: true,
        items: { select: { quantity: true } },
      },
    });
    if (!order) {
      return NextResponse.json({ error: "예약을 찾을 수 없습니다." }, { status: 404 });
    }

    // 승인 가능한 상태인지 확인
    if (!["REQUESTED", "DEPOSIT_CONFIRMED"].includes(order.cancelStatus)) {
      return NextResponse.json(
        { error: "결제취소 요청 또는 입금완료 상태의 예약만 승인할 수 있습니다." },
        { status: 400 }
      );
    }

    const now = new Date();
    const finalCancelStatus = "COMPLETED";

    // ── PG 환불 실호출 (미구현) ────────────────────────────────────
    // TODO(PG 계약 후 구현): seedpay/smartropay/ongi 환불 API 호출.
    //   - order.pgProvider 로 PG 를 분기하고 order.pgTid 로 원거래를 지정한다.
    //   - 환불 성공 시에만 아래 상태 전이를 수행하고, 실패하면 cancelStatus 를
    //     유지한 채 오류를 반환해야 한다(현재는 PG 미계약이라 무조건 성공 처리).
    //   - 당일취소(SAME_DAY)는 PG 승인취소, 익일 이후(POST_DAY)는 매입취소/환불 API 가 달라진다.
    // 지금은 실호출이 없으므로 "장부상 취소"만 수행한다는 사실을 로그로 남긴다.
    if (order.pgTid) {
      console.warn(
        `[cancel-approve] PG 환불 미연동 — 장부상으로만 취소 처리합니다. ` +
          `(orderId=${orderId}, provider=${order.pgProvider ?? "unknown"}, tid=${order.pgTid}, type=${order.cancelType ?? "-"})`,
      );
    }

    // 예약 최종 업데이트 + 이 예약에 적립된 미지급 고객 추천 커미션 취소.
    // 커미션을 함께 취소하지 않으면 취소된 예약의 커미션이 별도 정산 경로에서
    // 지급될 수 있다. 이미 지급(PAID)된 커미션은 건드리지 않는다. (docs/SETTLEMENT_ISSUES.md #6)
    //
    // 공동 프로모션 재고(잔여 수량) 복원도 함께 처리한다. 예약 생성 시
    // participantCount/currentQuantity/totalRevenue 를 올려두는데, 취소 승인에서
    // 되돌리지 않으면 취소된 예약이 캠페인 한도를 계속 점유해 남은 수량이 영구히 줄어든다.
    // (미결제 이탈분은 abort/orderCleanup 이 이미 같은 방식으로 롤백한다.)
    const cancelledQty = (order.items ?? []).reduce(
      (acc: number, i: { quantity: number }) => acc + i.quantity,
      0,
    );
    await prisma.$transaction([
      (prisma.reservation.update as any)({
        where: { id: orderId },
        data: {
          cancelApprovedAt: now,
          cancelStatus: finalCancelStatus,
          status: "CANCELLED",
          paymentStatus: "REFUNDED",
          cancelledAt: now,
          refundedAt: now,
        },
      }),
      prisma.referralCommission.updateMany({
        where: { reservationId: orderId, status: { in: ["PENDING", "CONFIRMED"] } },
        data: { status: "CANCELLED" },
      }),
      ...(order.campaignId
        ? [
            prisma.groupBuyCampaign.updateMany({
              where: { id: order.campaignId },
              data: {
                participantCount: { decrement: 1 },
                currentQuantity: { decrement: cancelledQty },
                totalRevenue: { decrement: Number(order.finalAmount) },
              },
            }),
          ]
        : []),
    ]);

    // 이 예약이 점유한 시간 슬롯 해제 — 다른 고객이 다시 예약할 수 있게 연다.
    // time_slots 테이블 미반영 환경에서도 취소 승인 자체는 실패하지 않도록 분리 처리.
    try {
      await prisma.timeSlot.updateMany({
        where: { reservationId: orderId },
        data: { isAvailable: true, reservationId: null },
      });
    } catch (e: any) {
      console.warn("[cancel-approve] TimeSlot 해제 실패(스키마 미반영 가능):", e?.message || e);
    }

    // 고객에게 예약취소 인앱 알림 (실패해도 취소 처리 흐름은 막지 않음)
    await notifyOrderCancelled(orderId).catch(() => {});

    return NextResponse.json({ cancelStatus: finalCancelStatus, message: "결제취소가 완료되었습니다." });
  } catch (e: any) {
    console.error("[cancel-approve POST]", e?.message || e);
    return NextResponse.json({ error: "결제취소 승인에 실패했습니다." }, { status: 500 });
  }
}
