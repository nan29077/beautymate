import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMockPgEnabled, signMockWebhook } from "@/lib/mockPg";
import MockPayClient from "./MockPayClient";

export const dynamic = "force-dynamic";

// 개발용 Mock PG 결제창 — 실제 PG 결제창을 대신해 성공/실패를 시뮬레이션한다.
// 시그니처는 서버에서 서명해 내려주며, 웹훅에서 HMAC 검증된다.
export default async function MockPayPage({
  searchParams,
}: {
  searchParams: Promise<{ reservationId?: string }> | { reservationId?: string };
}) {
  if (!isMockPgEnabled()) notFound();

  const session = await auth();
  const { reservationId } = await Promise.resolve(searchParams);
  if (!reservationId) notFound();
  if (!session?.user) {
    redirect(`/auth/login?callbackUrl=${encodeURIComponent(`/pay/mock?reservationId=${reservationId}`)}`);
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: {
      id: true,
      userId: true,
      reservationNumber: true,
      paymentStatus: true,
      finalAmount: true,
      customerName: true,
      seller: { select: { shopName: true } },
      items: { select: { productName: true } },
    },
  });
  if (!reservation || reservation.userId !== session.user.id) notFound();

  const timestamp = Date.now();
  const successPayload = {
    reservationId: reservation.id,
    result: "success" as const,
    timestamp,
    signature: signMockWebhook({
      reservationId: reservation.id,
      result: "success",
      timestamp,
    }),
  };
  const failPayload = {
    reservationId: reservation.id,
    result: "fail" as const,
    timestamp,
    signature: signMockWebhook({
      reservationId: reservation.id,
      result: "fail",
      timestamp,
    }),
  };

  return (
    <MockPayClient
      reservation={{
        id: reservation.id,
        reservationNumber: reservation.reservationNumber,
        alreadyPaid: reservation.paymentStatus === "COMPLETED",
        amount: Math.round(Number(reservation.finalAmount)),
        customerName: reservation.customerName,
        shopName: reservation.seller.shopName,
        productName: reservation.items[0]?.productName ?? "상담 상품",
      }}
      successPayload={successPayload}
      failPayload={failPayload}
    />
  );
}
