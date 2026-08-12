import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// 결제 시작 전/중 사용자가 취소했거나 결제 준비가 실패한 경우, PENDING 예약을 정리.
// 캠페인 카운터·추천 커미션도 함께 롤백한다.
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const order = await prisma.reservation.findUnique({
    where: { id: params.id },
    include: { items: true, referralCommissions: true },
  });
  if (!order) {
    return NextResponse.json({ error: "예약을 찾을 수 없습니다." }, { status: 404 });
  }
  if (order.userId !== session.user!.id) {
    return NextResponse.json({ error: "본인 예약만 취소할 수 있습니다." }, { status: 403 });
  }
  if (order.paymentStatus === "COMPLETED") {
    return NextResponse.json({ error: "이미 결제 완료된 예약은 취소 API로 처리하세요." }, { status: 400 });
  }
  if (order.status === "CANCELLED") {
    return NextResponse.json({ ok: true, alreadyCancelled: true });
  }

  await prisma.$transaction(async (tx) => {
    // 일반상담상품 재고 복원 — 예약 생성 시 차감했던 재고를 되돌린다.
    // (updateMany 사용: 그 사이 상담상품이 삭제됐어도 0건 처리되어 취소 자체는 성공한다)
    for (const it of order.items) {
      if (it.itemType !== "DIRECT") continue;
      await tx.directProduct.updateMany({
        where: { id: it.productId },
        data: { stock: { increment: it.quantity } },
      });
    }

    // 캠페인 카운터 롤백
    if (order.campaignId) {
      const totalQty = order.items.reduce((acc, i) => acc + i.quantity, 0);
      await tx.groupBuyCampaign.update({
        where: { id: order.campaignId },
        data: {
          participantCount: { decrement: 1 },
          currentQuantity: { decrement: totalQty },
          totalRevenue: { decrement: Number(order.finalAmount) },
        },
      });
    }

    // 추천 커미션 PENDING 롤백
    for (const c of order.referralCommissions) {
      if (c.status === "PENDING") {
        await tx.referralCommission.delete({ where: { id: c.id } });
        await tx.sellerProfile.update({
          where: { id: c.sellerId },
          data: { totalReferralEarnings: { decrement: Number(c.commissionAmount) } },
        });
      }
    }

    await tx.reservation.update({
      where: { id: order.id },
      data: {
        status: "CANCELLED",
        paymentStatus: "FAILED",
        cancelledAt: new Date(),
      },
    });
  });

  return NextResponse.json({ ok: true });
}
