import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getConsultantMemos } from "@/lib/consultantMemo";
import SellerCustomerDetailClient, {
  type CustomerDetail,
  type ConsultingHistoryItem,
} from "@/components/seller/SellerCustomerDetailClient";

export const dynamic = "force-dynamic";

export default async function SellerCustomerDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }> | { customerId: string };
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CONSULTANT") redirect("/");

  const seller = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!seller) redirect("/");

  const { customerId } = await Promise.resolve(params);

  // 본인이 상담한 예약만 조회 — 다른 상담사의 고객 정보는 볼 수 없다.
  const reservations = await prisma.reservation.findMany({
    where: { sellerId: seller.id, userId: customerId },
    include: {
      items: { select: { id: true, productName: true, quantity: true } },
      timeSlot: { select: { startTime: true, endTime: true } },
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
    orderBy: [{ reservationDate: "desc" }, { reservationTime: "desc" }],
  });

  if (reservations.length === 0) notFound();

  const memoMap = await getConsultantMemos(reservations.map((r) => r.id));

  const latest = reservations[0];
  const oldest = reservations[reservations.length - 1];

  const completedCount = reservations.filter((r) => r.status === "COMPLETED").length;
  const totalPaid = reservations.reduce(
    (sum, r) =>
      r.paymentStatus === "COMPLETED" && r.status !== "CANCELLED"
        ? sum + Number(r.finalAmount)
        : sum,
    0
  );

  const customer: CustomerDetail = {
    customerId,
    name: latest.customerName || latest.user?.name || "-",
    phone: latest.customerPhone || latest.user?.phone || "-",
    email: latest.user?.email ?? null,
    // 생년월일/성별/태어난 시각은 값이 입력된 가장 최근 예약 기준
    birthDate: reservations.find((r) => r.birthDate)?.birthDate ?? null,
    birthTime: reservations.find((r) => r.birthTime)?.birthTime ?? null,
    gender: reservations.find((r) => r.gender)?.gender ?? null,
    totalReservations: reservations.length,
    completedCount,
    totalPaid,
    firstReservationDate: oldest.reservationDate.toISOString(),
    lastReservationDate: latest.reservationDate.toISOString(),
  };

  const history: ConsultingHistoryItem[] = reservations.map((r) => ({
    id: r.id,
    reservationNumber: r.reservationNumber,
    status: r.status,
    paymentStatus: r.paymentStatus,
    reservationDate: r.reservationDate.toISOString(),
    reservationTime: r.reservationTime,
    endTime: r.timeSlot?.endTime ?? null,
    productNames: r.items.map((i) => i.productName),
    finalAmount: Number(r.finalAmount),
    consultingContent: r.consultingContent,
    consultantMemo: memoMap[r.id] ?? null,
  }));

  return <SellerCustomerDetailClient customer={customer} history={history} />;
}
