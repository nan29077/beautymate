import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requestCancel } from "@/lib/seedpay";
import { logPayment } from "@/lib/paymentLog";

export const dynamic = "force-dynamic";

// 결제 취소 (전체/부분). 관리자 또는 본인 예약 한정.
export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json();
  const { orderId, reason, partialAmount } = body as {
    orderId: string;
    reason?: string;
    partialAmount?: number;
  };

  if (!orderId) {
    return NextResponse.json({ error: "orderId가 필요합니다." }, { status: 400 });
  }

  const order = await prisma.reservation.findUnique({
    where: { id: orderId },
    include: { consultingSession: { select: { status: true, startedAt: true } } },
  });
  if (!order) {
    return NextResponse.json({ error: "예약을 찾을 수 없습니다." }, { status: 404 });
  }

  const role = session.user.role;
  const isOwner = order.userId === session.user!.id;
  const isAdmin = role === "SUPER_ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "취소 권한이 없습니다." }, { status: 403 });
  }

  if (order.paymentStatus !== "COMPLETED" || !order.pgTid) {
    return NextResponse.json({ error: "취소 가능한 결제가 아닙니다." }, { status: 400 });
  }

  // ── 고객 직접 취소 제한 ────────────────────────────────────────────
  // 이 라우트는 금액을 그대로 전액(또는 임의 부분) 환불한다. 뷰티 전문가가 이미 예약을
  // 확정했거나 상담이 끝난 뒤에도 고객이 마음대로 호출하면 서비스를 제공한 뷰티 전문가가
  // 대금을 잃는다. 확정 이후 취소는 뷰티 전문가 요청 → 관리자 승인 경로
  // (/api/orders/[id]/cancel-request → cancel-approve)로만 처리하고,
  // 여기서는 관리자만 직접 취소할 수 있게 한다.
  if (!isAdmin) {
    if (order.status === "CONFIRMED" || order.status === "COMPLETED") {
      return NextResponse.json(
        {
          error:
            "예약이 확정된 뒤에는 직접 취소할 수 없습니다. 뷰티샵 또는 고객센터로 취소를 요청해 주세요.",
        },
        { status: 403 },
      );
    }
    // 상담(영상 세션)이 시작됐거나 끝난 예약도 고객 임의 환불 대상이 아니다.
    const cs = order.consultingSession;
    if (cs && (cs.status === "ACTIVE" || cs.status === "COMPLETED" || cs.startedAt)) {
      return NextResponse.json(
        { error: "이미 진행된 상담은 직접 취소할 수 없습니다. 고객센터로 문의해 주세요." },
        { status: 403 },
      );
    }
    // 부분 취소는 정산 금액을 임의로 깎을 수 있어 관리자 전용이다.
    if (partialAmount && partialAmount > 0) {
      return NextResponse.json({ error: "부분 취소는 관리자만 요청할 수 있습니다." }, { status: 403 });
    }
  }

  const finalAmount = Math.round(Number(order.finalAmount));
  const ccAmt = partialAmount && partialAmount > 0 ? Math.round(partialAmount) : finalAmount;
  const partCanFlg = ccAmt < finalAmount ? "1" : "0";

  try {
    const result = await requestCancel({
      tid: order.pgTid,
      ccAmt,
      ccMsg: reason || "고객요청",
      partCanFlg,
    });

    if (result.resultCd !== "0000") {
      await logPayment({
        orderId: order.id,
        provider: "seedpay",
        stage: "cancel",
        status: "fail",
        message: `취소 실패 [${result.resultCd}] ${result.resultMsg}`,
        pgTid: order.pgTid,
        payload: { ccAmt, partCanFlg, reason: reason || "고객요청", result },
      });
      return NextResponse.json(
        { error: `[${result.resultCd}] ${result.resultMsg}` },
        { status: 400 },
      );
    }

    await prisma.reservation.update({
      where: { id: order.id },
      data: {
        status: partCanFlg === "0" ? "CANCELLED" : order.status,
        paymentStatus: partCanFlg === "0" ? "REFUNDED" : order.paymentStatus,
        cancelledAt: partCanFlg === "0" ? new Date() : order.cancelledAt,
        refundedAt: new Date(),
        pgAuthData: JSON.stringify({
          ...(order.pgAuthData ? safeParse(order.pgAuthData) : {}),
          cancel: result,
        }),
      },
    });

    await logPayment({
      orderId: order.id,
      provider: "seedpay",
      stage: "cancel",
      status: "success",
      message: `취소 완료 ccAmt=${ccAmt} part=${partCanFlg}`,
      pgTid: order.pgTid,
      payload: result,
    });
    return NextResponse.json({ ok: true, result });
  } catch (e: any) {
    await logPayment({
      orderId: order.id,
      provider: "seedpay",
      stage: "cancel",
      status: "fail",
      message: `취소 요청 예외: ${e?.message ?? "unknown"}`,
      pgTid: order.pgTid,
    });
    return NextResponse.json(
      { error: `취소 요청 실패: ${e?.message ?? "unknown"}` },
      { status: 500 },
    );
  }
}

function safeParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
