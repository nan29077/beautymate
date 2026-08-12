import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SellerReservationsClient from "@/components/seller/SellerReservationsClient";
import { getConsultantMemos } from "@/lib/consultantMemo";
import { safeQuery } from "@/lib/safeDb";

export const dynamic = "force-dynamic";

export default async function SellerReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; view?: string }> | { status?: string; view?: string };
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CONSULTANT") redirect("/");

  const seller = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!seller) redirect("/");

  const { status, view } = await Promise.resolve(searchParams);
  const statusFilter = status && status !== "ALL" ? status : undefined;

  const reservations = await safeQuery("seller reservations list", () =>
    prisma.reservation.findMany({
      where: {
        sellerId: seller.id,
        ...(statusFilter ? { status: statusFilter as "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW" } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: true,
        timeSlot: { select: { startTime: true, endTime: true } },
      },
      orderBy: [{ reservationDate: "desc" }, { reservationTime: "asc" }],
    }), []);

  // 상담 메모는 컬럼 미반영 환경을 대비해 별도 조회(실패 시 빈 값)
  const memoMap = await getConsultantMemos(
    reservations.filter((r) => r.status === "COMPLETED").map((r) => r.id)
  );

  const serialized = reservations.map((r) => ({
    id: r.id,
    reservationNumber: r.reservationNumber,
    status: r.status,
    reservationDate: r.reservationDate.toISOString(),
    reservationTime: r.reservationTime,
    customerName: r.customerName,
    customerPhone: r.customerPhone,
    birthDate: r.birthDate,
    birthTime: r.birthTime,
    gender: r.gender,
    consultingContent: r.consultingContent,
    finalAmount: Number(r.finalAmount),
    totalAmount: Number(r.totalAmount),
    confirmedAt: r.confirmedAt?.toISOString() || null,
    completedAt: r.completedAt?.toISOString() || null,
    cancelledAt: r.cancelledAt?.toISOString() || null,
    noShowAt: r.noShowAt?.toISOString() || null,
    consultantMemo: memoMap[r.id] ?? null,
    user: r.user,
    items: r.items.map((i) => ({
      id: i.id,
      productName: i.productName,
      price: Number(i.price),
      quantity: i.quantity,
    })),
    timeSlot: r.timeSlot,
  }));

  return (
    <SellerReservationsClient
      reservations={serialized}
      initialStatus={status || "ALL"}
      initialView={(view as "list" | "calendar") || "list"}
    />
  );
}
